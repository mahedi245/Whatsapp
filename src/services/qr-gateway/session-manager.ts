import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  Browsers,
  WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export interface GatewaySessionState {
  pairingStatus: 'DISCONNECTED' | 'SCANNING' | 'CONNECTED';
  qrCodeDataUrl: string | null;
  pairedPhoneNumber: string | null;
  pairedPushName: string | null;
  isConnected: boolean;
  lastUpdated: number;
}

interface ActiveSessionRecord {
  socket: WASocket | null;
  state: GatewaySessionState;
  isInitializing: boolean;
  initPromise?: Promise<GatewaySessionState>;
}

// Global cache to persist active socket connections across Next.js dev server reloads
const globalSessions = (globalThis as any).__baileysSessions || new Map<string, ActiveSessionRecord>();
(globalThis as any).__baileysSessions = globalSessions;

export class BaileysSessionManager {
  private static instance: BaileysSessionManager;

  private constructor() {}

  public static getInstance(): BaileysSessionManager {
    if (!BaileysSessionManager.instance) {
      BaileysSessionManager.instance = new BaileysSessionManager();
    }
    return BaileysSessionManager.instance;
  }

  private getSessionDirectory(tenantId: string): string {
    const dir = path.join(process.cwd(), 'sessions', `baileys_auth_${tenantId}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Normalize an input phone number to WhatsApp JID format (e.g. 8801608700420@s.whatsapp.net)
   */
  public normalizeJid(phone: string): string {
    let clean = phone.replace(/[^0-9]/g, '');

    // Common Bangladesh format handling: 017... -> 88017...
    if (clean.startsWith('01') && clean.length === 11) {
      clean = '88' + clean;
    }

    if (!clean.endsWith('@s.whatsapp.net')) {
      return `${clean}@s.whatsapp.net`;
    }
    return clean;
  }

  /**
   * Retrieves the current in-memory status or queries database fallback
   */
  public async getStatus(tenantId: string): Promise<GatewaySessionState> {
    const active = globalSessions.get(tenantId);
    if (active) {
      return active.state;
    }

    // Database lookup
    try {
      const config = await prisma.whatsAppConfig.findFirst({
        where: { tenantId },
      });

      if (config) {
        const state: GatewaySessionState = {
          pairingStatus: (config.pairingStatus as any) || 'DISCONNECTED',
          qrCodeDataUrl: config.qrCodeDataUrl,
          pairedPhoneNumber: config.pairedPhoneNumber || config.displayPhoneNumber,
          pairedPushName: config.pairedPushName || config.verifiedName,
          isConnected: config.pairingStatus === 'CONNECTED' || config.isConnected,
          lastUpdated: Date.now(),
        };

        // Cache initial record
        globalSessions.set(tenantId, {
          socket: null,
          state,
          isInitializing: false,
        });

        return state;
      }
    } catch (err) {
      console.warn('DB lookup in getStatus skipped:', err);
    }

    return {
      pairingStatus: 'DISCONNECTED',
      qrCodeDataUrl: null,
      pairedPhoneNumber: null,
      pairedPushName: null,
      isConnected: false,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Initializes or restores the Baileys Multi-Device socket connection
   */
  public async initializeSocket(tenantId: string, forceNew: boolean = false): Promise<GatewaySessionState> {
    const active = globalSessions.get(tenantId);

    if (!forceNew && active) {
      if (active.state.pairingStatus === 'CONNECTED' && active.socket) {
        return active.state;
      }
      if (active.isInitializing && active.initPromise) {
        return active.initPromise;
      }
    }

    const sessionDir = this.getSessionDirectory(tenantId);
    const sessionRecord: ActiveSessionRecord = {
      socket: null,
      state: {
        pairingStatus: 'SCANNING',
        qrCodeDataUrl: null,
        pairedPhoneNumber: null,
        pairedPushName: null,
        isConnected: false,
        lastUpdated: Date.now(),
      },
      isInitializing: true,
    };

    globalSessions.set(tenantId, sessionRecord);

    const initPromise = (async (): Promise<GatewaySessionState> => {
      try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const socket = makeWASocket({
          auth: state,
          logger: pino({ level: 'silent' }),
          browser: Browsers.windows('Desktop'),
          printQRInTerminal: false,
          defaultQueryTimeoutMs: 60000,
          syncFullHistory: false,
        });

        sessionRecord.socket = socket;

        // Credential persistence
        socket.ev.on('creds.update', saveCreds);

        // Connection lifecycle updates
        socket.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update;

          // 1. QR code received for pairing
          if (qr) {
            try {
              const qrDataUrl = await QRCode.toDataURL(qr, {
                margin: 2,
                scale: 7,
                color: { dark: '#0F172A', light: '#FFFFFF' },
              });

              sessionRecord.state.pairingStatus = 'SCANNING';
              sessionRecord.state.qrCodeDataUrl = qrDataUrl;
              sessionRecord.state.isConnected = false;
              sessionRecord.state.lastUpdated = Date.now();

              await prisma.whatsAppConfig.updateMany({
                where: { tenantId },
                data: {
                  pairingStatus: 'SCANNING',
                  qrCodeDataUrl: qrDataUrl,
                  isConnected: false,
                },
              }).catch(() => {});
            } catch (qrErr) {
              console.error('Failed to convert QR to Data URL:', qrErr);
            }
          }

          // 2. Connection successfully established
          if (connection === 'open') {
            const rawId = socket.user?.id || '';
            const rawPhone = rawId.split(':')[0] || rawId.split('@')[0];
            const cleanPhone = '+' + rawPhone.replace(/[^0-9]/g, '');
            const pushName = socket.user?.name || socket.user?.notify || 'WhatsApp Business';

            sessionRecord.state.pairingStatus = 'CONNECTED';
            sessionRecord.state.isConnected = true;
            sessionRecord.state.pairedPhoneNumber = cleanPhone;
            sessionRecord.state.pairedPushName = pushName;
            sessionRecord.state.qrCodeDataUrl = null;
            sessionRecord.state.lastUpdated = Date.now();
            sessionRecord.isInitializing = false;

            console.log(`✅ WhatsApp Web Gateway Connected for tenant ${tenantId} as ${cleanPhone} (${pushName})`);

            await prisma.whatsAppConfig.updateMany({
              where: { tenantId },
              data: {
                gatewayProvider: 'BAILEYS',
                pairingStatus: 'CONNECTED',
                isConnected: true,
                pairedPhoneNumber: cleanPhone,
                pairedPushName: pushName,
                displayPhoneNumber: cleanPhone,
                verifiedName: pushName,
                qrCodeDataUrl: null,
                lastSyncedAt: new Date(),
              },
            }).catch(() => {});
          }

          // 3. Connection closed / disconnected
          if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const isLoggedOut = statusCode === DisconnectReason.loggedOut;

            console.warn(`⚠️ WhatsApp Web Gateway Closed for tenant ${tenantId}. Status: ${statusCode}, LoggedOut: ${isLoggedOut}`);

            if (isLoggedOut) {
              // Wipe local auth session directory
              try {
                fs.rmSync(sessionDir, { recursive: true, force: true });
              } catch (rmErr) {}

              sessionRecord.socket = null;
              sessionRecord.state = {
                pairingStatus: 'DISCONNECTED',
                qrCodeDataUrl: null,
                pairedPhoneNumber: null,
                pairedPushName: null,
                isConnected: false,
                lastUpdated: Date.now(),
              };
              sessionRecord.isInitializing = false;

              await prisma.whatsAppConfig.updateMany({
                where: { tenantId },
                data: {
                  pairingStatus: 'DISCONNECTED',
                  isConnected: false,
                  qrCodeDataUrl: null,
                },
              }).catch(() => {});
            } else {
              // Automatic reconnect on transient network drops
              sessionRecord.state.isConnected = false;
              sessionRecord.isInitializing = false;
              setTimeout(() => {
                this.initializeSocket(tenantId, true).catch(() => {});
              }, 3000);
            }
          }
        });

        sessionRecord.isInitializing = false;
        return sessionRecord.state;
      } catch (error) {
        console.error('Failed to initialize Baileys socket:', error);
        sessionRecord.isInitializing = false;
        sessionRecord.state.pairingStatus = 'DISCONNECTED';
        return sessionRecord.state;
      }
    })();

    sessionRecord.initPromise = initPromise;
    return initPromise;
  }

  /**
   * Send a direct message or media attachment with human presence emulation
   */
  public async sendDirectMessage(
    tenantId: string,
    options: {
      to: string;
      text: string;
      mediaUrl?: string;
      mediaType?: 'NONE' | 'DOCUMENT' | 'IMAGE' | 'VIDEO';
      filename?: string;
      mimeType?: string;
    }
  ): Promise<{ messageId: string }> {
    const active = globalSessions.get(tenantId);
    if (!active?.socket || active.state.pairingStatus !== 'CONNECTED') {
      // Attempt reconnect if session folder exists
      await this.initializeSocket(tenantId);
      const rechecked = globalSessions.get(tenantId);
      if (!rechecked?.socket || rechecked.state.pairingStatus !== 'CONNECTED') {
        throw new Error('WhatsApp Web Gateway is not connected. Please scan the QR code first.');
      }
    }

    const sock = globalSessions.get(tenantId)!.socket!;
    const jid = this.normalizeJid(options.to);

    // 1. Anti-Ban Human Emulation: Trigger 'composing' (typing indicator)
    try {
      await sock.sendPresenceUpdate('composing', jid);
      // Wait 1.2 to 2.5 seconds to emulate typing
      const typingDelay = Math.floor(Math.random() * 1300) + 1200;
      await new Promise((resolve) => setTimeout(resolve, typingDelay));
    } catch (presenceErr) {
      // Non-fatal if presence fails
    }

    let response: any;

    // 2. Dispatch Media or Rich Text
    if (options.mediaUrl && options.mediaType && options.mediaType !== 'NONE') {
      if (options.mediaType === 'DOCUMENT') {
        response = await sock.sendMessage(jid, {
          document: { url: options.mediaUrl },
          mimetype: options.mimeType || 'application/pdf',
          fileName: options.filename || 'Quotation.pdf',
          caption: options.text || undefined,
        });
      } else if (options.mediaType === 'IMAGE') {
        response = await sock.sendMessage(jid, {
          image: { url: options.mediaUrl },
          caption: options.text || undefined,
        });
      } else if (options.mediaType === 'VIDEO') {
        response = await sock.sendMessage(jid, {
          video: { url: options.mediaUrl },
          caption: options.text || undefined,
        });
      }
    } else {
      response = await sock.sendMessage(jid, {
        text: options.text,
      });
    }

    // 3. Clear presence
    try {
      await sock.sendPresenceUpdate('paused', jid);
    } catch (e) {}

    const messageId = response?.key?.id || `baileys_${Date.now()}`;
    return { messageId };
  }

  /**
   * Graceful disconnection & wipe
   */
  public async disconnect(tenantId: string): Promise<void> {
    const active = globalSessions.get(tenantId);
    if (active?.socket) {
      try {
        await active.socket.logout();
      } catch (err) {}
      try {
        active.socket.end(undefined);
      } catch (err) {}
    }

    const sessionDir = this.getSessionDirectory(tenantId);
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (err) {}

    globalSessions.delete(tenantId);

    await prisma.whatsAppConfig.updateMany({
      where: { tenantId },
      data: {
        pairingStatus: 'DISCONNECTED',
        isConnected: false,
        qrCodeDataUrl: null,
        pairedPhoneNumber: null,
      },
    }).catch(() => {});
  }
}
