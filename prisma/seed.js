const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@farm.local',
      password_hash: adminPassword,
      role: 'ADMIN'
    }
  });
  console.log('Created admin user:', admin.username);

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 10);
  const staff = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      username: 'staff',
      email: 'staff@farm.local',
      password_hash: staffPassword,
      role: 'STAFF'
    }
  });
  console.log('Created staff user:', staff.username);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { category_id: 1 },
      update: {},
      create: { category_name: 'Livestock', description: 'Farm animals' }
    }),
    prisma.category.upsert({
      where: { category_id: 2 },
      update: {},
      create: { category_name: 'Feed', description: 'Animal feed and supplements' }
    }),
    prisma.category.upsert({
      where: { category_id: 3 },
      update: {},
      create: { category_name: 'Equipment', description: 'Farm equipment and tools' }
    }),
    prisma.category.upsert({
      where: { category_id: 4 },
      update: {},
      create: { category_name: 'Seeds', description: 'Planting seeds' }
    }),
    prisma.category.upsert({
      where: { category_id: 5 },
      update: {},
      create: { category_name: 'Fertilizers', description: 'Soil fertilizers' }
    })
  ]);
  console.log('Created categories:', categories.length);

  // Create items
  const items = await Promise.all([
    prisma.item.upsert({
      where: { item_id: 1 },
      update: {},
      create: { items_description: 'Cattle - Holstein', category_id: 1, created_by: 'system' }
    }),
    prisma.item.upsert({
      where: { item_id: 2 },
      update: {},
      create: { items_description: 'Cattle - Angus', category_id: 1, created_by: 'system' }
    }),
    prisma.item.upsert({
      where: { item_id: 3 },
      update: {},
      create: { items_description: 'Sheep - Merino', category_id: 1, created_by: 'system' }
    }),
    prisma.item.upsert({
      where: { item_id: 4 },
      update: {},
      create: { items_description: 'Goat - Boer', category_id: 1, created_by: 'system' }
    }),
    prisma.item.upsert({
      where: { item_id: 5 },
      update: {},
      create: { items_description: 'Hay Bales', category_id: 2, created_by: 'system' }
    }),
    prisma.item.upsert({
      where: { item_id: 6 },
      update: {},
      create: { items_description: 'Cattle Feed Mix', category_id: 2, created_by: 'system' }
    }),
    prisma.item.upsert({
      where: { item_id: 7 },
      update: {},
      create: { items_description: 'Tractor Parts', category_id: 3, created_by: 'system' }
    })
  ]);
  console.log('Created items:', items.length);

  // Create banks
  const banks = await Promise.all([
    prisma.bank.upsert({
      where: { bank_id: 1 },
      update: {},
      create: { bank_name: 'Santander', created_by: 'system' }
    }),
    prisma.bank.upsert({
      where: { bank_id: 2 },
      update: {},
      create: { bank_name: 'BBVA', created_by: 'system' }
    }),
    prisma.bank.upsert({
      where: { bank_id: 3 },
      update: {},
      create: { bank_name: 'CaixaBank', created_by: 'system' }
    })
  ]);
  console.log('Created banks:', banks.length);

  // Create sample suppliers
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { supplier_id: 1 },
      update: {},
      create: {
        supplier_name: 'Costa del Sol Livestock',
        contact_person: 'Juan Garcia',
        country: 'Spain',
        state: 'Andalusia',
        city: 'Malaga',
        phone_number: '+34 952 123 456',
        email_address: 'info@costadelsol-livestock.es',
        created_by: 'system'
      }
    }),
    prisma.supplier.upsert({
      where: { supplier_id: 2 },
      update: {},
      create: {
        supplier_name: 'Andalusia Feed Co.',
        contact_person: 'Maria Lopez',
        country: 'Spain',
        state: 'Andalusia',
        city: 'Seville',
        phone_number: '+34 955 789 012',
        email_address: 'sales@andalusiafeed.es',
        created_by: 'system'
      }
    })
  ]);
  console.log('Created suppliers:', suppliers.length);

  // Create sample customers
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { customer_id: 1 },
      update: {},
      create: {
        customer_name: 'Marbella Ranch',
        contact_person: 'Carlos Ruiz',
        country: 'Spain',
        state: 'Andalusia',
        city: 'Marbella',
        phone_number: '+34 952 456 789',
        email_address: 'ranch@marbella.es',
        created_by: 'system'
      }
    }),
    prisma.customer.upsert({
      where: { customer_id: 2 },
      update: {},
      create: {
        customer_name: 'Granada Farms',
        contact_person: 'Ana Martinez',
        country: 'Spain',
        state: 'Andalusia',
        city: 'Granada',
        phone_number: '+34 958 321 654',
        email_address: 'contact@granadafarms.es',
        created_by: 'system'
      }
    })
  ]);
  console.log('Created customers:', customers.length);

  // Create sample employees
  const employees = await Promise.all([
    prisma.employee.upsert({
      where: { employee_no: 1 },
      update: {},
      create: {
        employee_name: 'Pedro Sanchez',
        father_name: 'Miguel Sanchez',
        city: 'Malaga',
        state: 'Andalusia',
        phone_no: '+34 600 111 222',
        mobile_no: '+34 600 111 222',
        status: 'active',
        doj: new Date('2020-01-15')
      }
    }),
    prisma.employee.upsert({
      where: { employee_no: 2 },
      update: {},
      create: {
        employee_name: 'Rosa Fernandez',
        father_name: 'Jose Fernandez',
        city: 'Marbella',
        state: 'Andalusia',
        phone_no: '+34 600 333 444',
        mobile_no: '+34 600 333 444',
        status: 'active',
        doj: new Date('2021-06-01')
      }
    })
  ]);
  console.log('Created employees:', employees.length);

  console.log('Seeding completed!');
  console.log('\nDefault credentials:');
  console.log('Admin: admin / admin123');
  console.log('Staff: staff / staff123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
