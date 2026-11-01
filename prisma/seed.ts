import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Default Organization / Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Bulk Messaging Pro',
      slug: 'acme-corp',
      brandColor: '#25D366',
      planType: 'PRO',
      maxContactsLimit: 10000,
      maxMonthlyCampaignsLimit: 100,
      maxMessagesPerMonth: 50000,
      messagesSentThisMonth: 120,
    },
  });

  console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})`);

  // 2. Create Tenant Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Tanvir Hossain',
      email: 'admin@acme.com',
      passwordHash,
      role: 'TENANT_ADMIN',
    },
  });

  console.log(`✅ Admin user created: ${adminUser.email}`);

  // 3. Create WhatsApp API Configuration with User's Meta Credentials
  await prisma.whatsAppConfig.upsert({
    where: { tenantId: tenant.id },
    update: {
      wabaId: '2423715105131368',
      phoneNumberId: '1316638444876007',
      isConnected: true,
      lastSyncedAt: new Date(),
    },
    create: {
      tenantId: tenant.id,
      wabaId: '2423715105131368',
      phoneNumberId: '1316638444876007',
      displayPhoneNumber: '+1 (555) 184-6893',
      verifiedName: 'Bulk Messaging Pro Official',
      qualityRating: 'GREEN',
      messagingTier: 'TIER_1K',
      encryptedAccessToken: 'EAAXxXx_SamplePermanentMetaToken_xXxX',
      webhookVerifyToken: 'whatsapp_bulk_webhook_verify_token_2026',
      isConnected: true,
      lastSyncedAt: new Date(),
    },
  });

  console.log('✅ WhatsApp API configuration initialized with WABA ID and Phone Number ID');

  // 4. Create Tags
  const tagVip = await prisma.tag.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'VIP Clients' } },
    update: {},
    create: { tenantId: tenant.id, name: 'VIP Clients', color: '#10B981' },
  });

  const tagRetail = await prisma.tag.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Wholesale Buyers' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Wholesale Buyers', color: '#3B82F6' },
  });

  const tagLeads = await prisma.tag.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Catalog Requests' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Catalog Requests', color: '#8B5CF6' },
  });

  // 5. Create Contact Group
  const group = await prisma.contactGroup.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Q4 Product Launch Audience' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Q4 Product Launch Audience',
      description: 'Audience for sending PDF quotations and product catalogs',
    },
  });

  // 6. Seed Sample Contacts with dynamic variables
  const sampleContacts = [
    {
      phoneNumber: '+8801711000001',
      firstName: 'Rahim',
      lastName: 'Uddin',
      company: 'Rahim Traders Ltd',
      email: 'rahim@example.com',
      customAttributes: JSON.stringify({
        due_amount: '12,500 BDT',
        quotation_no: 'QT-2026-091',
        discount: '15%',
        product_item: 'Premium Steel Pipes',
      }),
    },
    {
      phoneNumber: '+8801811000002',
      firstName: 'Fatema',
      lastName: 'Begum',
      company: 'Bengal Fashion House',
      email: 'fatema@example.com',
      customAttributes: JSON.stringify({
        due_amount: '35,000 BDT',
        quotation_no: 'QT-2026-092',
        discount: '20%',
        product_item: 'Autumn Textile Catalog',
      }),
    },
    {
      phoneNumber: '+8801911000003',
      firstName: 'Kamal',
      lastName: 'Hasan',
      company: 'Apex Logistics',
      email: 'kamal@example.com',
      customAttributes: JSON.stringify({
        due_amount: '8,200 BDT',
        quotation_no: 'QT-2026-093',
        discount: '10%',
        product_item: 'Heavy Machinery Brochure',
      }),
    },
    {
      phoneNumber: '+8801611000004',
      firstName: 'Nusrat',
      lastName: 'Jahan',
      company: 'Dhaka Tech Park',
      email: 'nusrat@example.com',
      customAttributes: JSON.stringify({
        due_amount: '45,000 BDT',
        quotation_no: 'QT-2026-094',
        discount: '25%',
        product_item: 'IT Equipment & Servers',
      }),
    },
    {
      phoneNumber: '+8801511000005',
      firstName: 'Saiful',
      lastName: 'Islam',
      company: 'Padma Electronics',
      email: 'saiful@example.com',
      customAttributes: JSON.stringify({
        due_amount: '18,900 BDT',
        quotation_no: 'QT-2026-095',
        discount: '12%',
        product_item: 'LED Displays & Panels',
      }),
    },
  ];

  for (const c of sampleContacts) {
    const contact = await prisma.contact.upsert({
      where: { tenantId_phoneNumber: { tenantId: tenant.id, phoneNumber: c.phoneNumber } },
      update: {},
      create: {
        tenantId: tenant.id,
        phoneNumber: c.phoneNumber,
        firstName: c.firstName,
        lastName: c.lastName,
        company: c.company,
        email: c.email,
        customAttributes: c.customAttributes,
      },
    });

    // Attach to VIP tag
    await prisma.contactTagMapping.upsert({
      where: { contactId_tagId: { contactId: contact.id, tagId: tagVip.id } },
      update: {},
      create: { contactId: contact.id, tagId: tagVip.id },
    });

    // Attach to Group
    await prisma.contactGroupMember.upsert({
      where: { groupId_contactId: { groupId: group.id, contactId: contact.id } },
      update: {},
      create: { groupId: group.id, contactId: contact.id },
    });
  }

  console.log(`✅ Seeded ${sampleContacts.length} contacts with tags & group memberships`);

  // 7. Seed WhatsApp Templates
  // Template A: Quotation with PDF Document Header
  await prisma.template.upsert({
    where: {
      tenantId_name_language: {
        tenantId: tenant.id,
        name: 'b2b_quotation_pdf_delivery',
        language: 'en_US',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      metaTemplateId: '987654321001',
      name: 'b2b_quotation_pdf_delivery',
      language: 'en_US',
      category: 'MARKETING',
      status: 'APPROVED',
      parameterFormat: 'POSITIONAL',
      componentsJson: JSON.stringify([
        {
          type: 'HEADER',
          format: 'DOCUMENT',
          example: {
            header_handle: ['https://example.com/quotations/sample_quote.pdf'],
          },
        },
        {
          type: 'BODY',
          text: 'Hello {{1}},\n\nThank you for choosing Bulk Messaging Pro! Please find attached your official Quotation (Ref: {{2}}) for {{3}}.\n\nYour exclusive discount of {{4}} has been applied. Let us know if you would like to proceed with the order.\n\nBest regards,\nSales Team',
          example: {
            body_text: [['Rahim', 'QT-2026-091', 'Premium Steel Pipes', '15%']],
          },
        },
        {
          type: 'FOOTER',
          text: 'Reply STOP to unsubscribe at any time.',
        },
        {
          type: 'BUTTONS',
          buttons: [
            {
              type: 'QUICK_REPLY',
              text: 'Confirm Order ✅',
            },
            {
              type: 'QUICK_REPLY',
              text: 'Request Call 📞',
            },
          ],
        },
      ]),
      sampleValuesJson: JSON.stringify({
        '1': 'Customer Name',
        '2': 'Quotation No',
        '3': 'Product Name',
        '4': 'Discount %',
      }),
    },
  });

  // Template B: Product Catalogue with Image Header
  await prisma.template.upsert({
    where: {
      tenantId_name_language: {
        tenantId: tenant.id,
        name: 'product_catalogue_showcase',
        language: 'en_US',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      metaTemplateId: '987654321002',
      name: 'product_catalogue_showcase',
      language: 'en_US',
      category: 'MARKETING',
      status: 'APPROVED',
      parameterFormat: 'POSITIONAL',
      componentsJson: JSON.stringify([
        {
          type: 'HEADER',
          format: 'IMAGE',
          example: {
            header_handle: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff'],
          },
        },
        {
          type: 'BODY',
          text: 'Dear {{1}},\n\nDiscover our brand new Product Catalogue for {{2}}! We have introduced over 50+ new wholesale items with special pricing for {{3}}.\n\nCheck out the catalogue now or reply to this message to speak with your dedicated account manager.',
          example: {
            body_text: [['Rahim', 'Q4 Season', 'Rahim Traders Ltd']],
          },
        },
        {
          type: 'FOOTER',
          text: 'Bulk Messaging Pro Catalogue 2026',
        },
        {
          type: 'BUTTONS',
          buttons: [
            {
              type: 'URL',
              text: 'View Online Catalog',
              url: 'https://example.com/catalog',
            },
            {
              type: 'QUICK_REPLY',
              text: 'Talk to Sales',
            },
          ],
        },
      ]),
      sampleValuesJson: JSON.stringify({
        '1': 'Customer Name',
        '2': 'Season/Category',
        '3': 'Company Name',
      }),
    },
  });

  console.log('✅ Seeded approved templates with PDF Quotation and Image Catalogue support');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
