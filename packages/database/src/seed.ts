import { PrismaClient } from '.prisma/client';

if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_ENV !== 'development') {
    process.exit();
}

console.log('Recognized development environment, performing seeding...');

(async () => {
    const prisma = new PrismaClient();
    
    const ADMIN_USERNAME = '@dev_admin';
    
    await prisma.user.create({
        data: {
            username: ADMIN_USERNAME,
            displayName: ADMIN_USERNAME,
            firstName: 'Dev',
            lastName: ADMIN_USERNAME,
            email: `${ADMIN_USERNAME}-noreply@necode.invalid`,
            rights: 'Admin',
            classes: { create: {
                role: 'Instructor',
                classroom: { create: {
                    displayName: 'Test Classroom',
                } }
            } }
        }
    });

})();

