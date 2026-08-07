#!/usr/bin/env node
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error(`Missing DATABASE_URL in ${envPath}`);
  process.exit(1);
}

const prisma = new PrismaClient();

const dummyServices = [
  { id: 'maid', name: 'Maid', category: 'Daily Help', tags: ['Cleaning', 'Sweeping'], icon: 'construct', color: 'tints.purple' },
  { id: 'cook', name: 'Cook', category: 'Daily Help', tags: ['Meal prep', 'Cooking'], icon: 'restaurant', color: 'tints.emeraldSoft' },
  { id: 'babysitter', name: 'Babysitter', category: 'Daily Help', tags: ['Child care', 'Play time'], icon: 'person', color: 'tints.amber' },
  { id: 'seniorCare', name: 'Senior Care', category: 'Daily Help', tags: ['Elderly care', 'Medication help', 'Companionship'], icon: 'heart', color: 'tints.orange' },
  { id: 'groceryAssistant', name: 'Grocery Assistant', category: 'Daily Help', tags: ['Shopping', 'Delivery', 'Errands'], icon: 'cart', color: 'tints.blue' },
  { id: 'laundryService', name: 'Laundry Service', category: 'Daily Help', tags: ['Wash', 'Iron', 'Fold'], icon: 'shirt', color: 'tints.sky' },
  { id: 'petWalker', name: 'Pet Walker', category: 'Daily Help', tags: ['Dog walking', 'Pet care'], icon: 'paw', color: 'tints.green' },
  { id: 'gardener', name: 'Gardener', category: 'Daily Help', tags: ['Lawn care', 'Plant watering', 'Pruning'], icon: 'flower', color: 'tints.greenSoft' },
  { id: 'housekeeper', name: 'Housekeeper', category: 'Daily Help', tags: ['Housekeeping', 'Organizing', 'Surface cleaning'], icon: 'sparkles', color: 'tints.pink' },
  { id: 'homeCook', name: 'Home Cook', category: 'Daily Help', tags: ['Home meals', 'Custom diet'], icon: 'restaurant', color: 'tints.rose' },
  { id: 'elderlyCompanion', name: 'Elderly Companion', category: 'Daily Help', tags: ['Company', 'Medication reminders', 'Conversation'], icon: 'people', color: 'tints.lime' },
  { id: 'childTutor', name: 'Child Tutor', category: 'Daily Help', tags: ['Homework help', 'Reading', 'Math'], icon: 'book', color: 'tints.indigo' },
  { id: 'mealPlanner', name: 'Meal Planner', category: 'Daily Help', tags: ['Menu planning', 'Grocery list', 'Nutritious meals'], icon: 'leaf', color: 'tints.teal' },
  { id: 'windowCleaner', name: 'Window Cleaner', category: 'Daily Help', tags: ['Glass cleaning', 'Window washing', 'Screen clean'], icon: 'sunny', color: 'tints.blue' },
  { id: 'vehicleWasher', name: 'Vehicle Washer', category: 'Daily Help', tags: ['Car wash', 'Bike wash', 'Waxing'], icon: 'car', color: 'tints.cyan' },
  { id: 'electrician', name: 'Electrician', category: 'Home Repairs', tags: ['Lights', 'Socket repair', 'Wiring'], icon: 'flash', color: 'tints.blue' },
  { id: 'plumber', name: 'Plumber', category: 'Home Repairs', tags: ['Leak repair', 'Drain unblock', 'Tap installation'], icon: 'water', color: 'tints.sky' },
  { id: 'carpenter', name: 'Carpenter', category: 'Home Repairs', tags: ['Furniture repair', 'Woodwork', 'Cabinets'], icon: 'hammer', color: 'tints.brown' },
  { id: 'painter', name: 'Painter', category: 'Home Repairs', tags: ['Wall paint', 'Texture', 'Staining'], icon: 'color-palette', color: 'tints.rose' },
  { id: 'acRepair', name: 'AC Repair', category: 'Home Repairs', tags: ['Gas refill', 'Cooling issue', 'Maintenance'], icon: 'snow', color: 'tints.sky' },
  { id: 'washingMachineRepair', name: 'Washing Machine Repair', category: 'Home Repairs', tags: ['Not spinning', 'Water leaking', 'Drain issue'], icon: 'refresh-circle', color: 'tints.indigo' },
  { id: 'refrigeratorRepair', name: 'Refrigerator Repair', category: 'Home Repairs', tags: ['Not cooling', 'Gas refill', 'Compressor issue'], icon: 'snow', color: 'tints.blue' },
  { id: 'microwaveRepair', name: 'Microwave Repair', category: 'Home Repairs', tags: ['Not heating', 'Turntable issue', 'Sparking'], icon: 'flash', color: 'tints.purple' },
  { id: 'geyserRepair', name: 'Geyser Repair', category: 'Home Repairs', tags: ['No heating', 'Leak repair', 'Installation'], icon: 'flame', color: 'tints.amber' },
  { id: 'pestControl', name: 'Pest Control', category: 'Home Repairs', tags: ['Termites', 'Cockroaches', 'Mosquitoes'], icon: 'bug', color: 'tints.orange' },
  { id: 'chimneyCleaning', name: 'Chimney Cleaning', category: 'Home Repairs', tags: ['Oil stains', 'Smoke smell', 'Deep clean'], icon: 'flame', color: 'tints.red' },
  { id: 'tileCleaning', name: 'Tile Cleaning', category: 'Home Repairs', tags: ['Floor cleaning', 'Grout wash', 'Sanitization'], icon: 'sparkles', color: 'tints.green' },
  { id: 'waterPurifierService', name: 'Water Purifier Service', category: 'Home Repairs', tags: ['Filter change', 'Service', 'Leak fix'], icon: 'water', color: 'tints.sky' },
  { id: 'cctvInstallation', name: 'CCTV Installation', category: 'Home Repairs', tags: ['Camera install', 'DVR setup', 'Troubleshooting'], icon: 'videocam', color: 'tints.purple' },
  { id: 'internetSetup', name: 'Internet Setup', category: 'Home Repairs', tags: ['Router setup', 'Wi-Fi extension', 'Network troubleshooting'], icon: 'wifi', color: 'tints.indigo' },
  { id: 'mobileRepair', name: 'Mobile Repair', category: 'Professional Services', tags: ['Screen', 'Battery', 'Charging port', 'Camera'], icon: 'phone-portrait', color: 'tints.indigo' },
  { id: 'laptopRepair', name: 'Laptop Repair', category: 'Professional Services', tags: ['Screen', 'Battery', 'Software', 'Hardware'], icon: 'laptop', color: 'tints.blue' },
  { id: 'photographer', name: 'Photographer', category: 'Professional Services', tags: ['Portrait', 'Event', 'Product', 'Wedding'], icon: 'camera', color: 'tints.purple' },
  { id: 'tutor', name: 'Tutor', category: 'Professional Services', tags: ['Maths', 'Science', 'Languages', 'Exam prep'], icon: 'book', color: 'tints.indigo' },
  { id: 'yogaTrainer', name: 'Yoga Trainer', category: 'Professional Services', tags: ['Yoga', 'Meditation', 'Fitness'], icon: 'heart', color: 'tints.green' },
  { id: 'dietician', name: 'Dietician', category: 'Professional Services', tags: ['Nutrition', 'Weight loss', 'Meal plan'], icon: 'leaf', color: 'tints.lime' },
  { id: 'makeupArtist', name: 'Makeup Artist', category: 'Professional Services', tags: ['Bridal', 'Party', 'Fashion'], icon: 'brush', color: 'tints.pink' },
  { id: 'eventPlanner', name: 'Event Planner', category: 'Professional Services', tags: ['Wedding', 'Corporate', 'Birthday'], icon: 'calendar', color: 'tints.amber' },
  { id: 'carpetCleaning', name: 'Carpet Cleaning', category: 'More Services', tags: ['Stain removal', 'Deep clean', 'Deodorize'], icon: 'sparkles', color: 'tints.greenSoft' },
  { id: 'sofaCleaning', name: 'Sofa Cleaning', category: 'More Services', tags: ['Fabric care', 'Stain removal', 'Steam cleaning'], icon: 'construct', color: 'tints.purple' },
  { id: 'packersMovers', name: 'Packers & Movers', category: 'More Services', tags: ['Local shift', 'Commercial shift', 'Packing'], icon: 'cube', color: 'tints.indigo' },
  { id: 'salonAtHome', name: 'Salon at Home', category: 'More Services', tags: ['Haircut', 'Facial', 'Waxing', 'Threading'], icon: 'cut', color: 'tints.pink' },
  { id: 'cakeDecorator', name: 'Cake Decorator', category: 'More Services', tags: ['Custom cakes', 'Birthday', 'Wedding'], icon: 'cake', color: 'tints.rose' },
  { id: 'caterer', name: 'Caterer', category: 'More Services', tags: ['Buffet', 'Party', 'Vegetarian', 'Non-veg'], icon: 'fast-food', color: 'tints.amber' },
  { id: 'homeTutor', name: 'Home Tutor', category: 'More Services', tags: ['Kids', 'Adult learning', 'Language'], icon: 'book', color: 'tints.indigo' },
  { id: 'fitnessCoach', name: 'Fitness Coach', category: 'Wellness', tags: ['Strength', 'Cardio', 'Personal training'], icon: 'barbell', color: 'tints.red' },
  { id: 'beautyTherapist', name: 'Beauty Therapist', category: 'Wellness', tags: ['Facial', 'Spa', 'Massage'], icon: 'heart', color: 'tints.pink' },
  { id: 'nutritionCoach', name: 'Nutrition Coach', category: 'Wellness', tags: ['Diet plan', 'Health advice', 'Supplements'], icon: 'leaf', color: 'tints.lime' },
  { id: 'computerHelp', name: 'Computer Help', category: 'Wellness', tags: ['Software', 'Virus', 'Performance'], icon: 'desktop', color: 'tints.blue' },
  { id: 'applianceInstaller', name: 'Appliance Installer', category: 'Home Repairs', tags: ['TV', 'Refrigerator', 'Washing Machine'], icon: 'wifi', color: 'tints.teal' },
  { id: 'homeSecurity', name: 'Home Security', category: 'Home Repairs', tags: ['Alarm system', 'Door sensors', 'Install'], icon: 'shield-check', color: 'tints.gray' },
  { id: 'solarInstaller', name: 'Solar Installer', category: 'Home Repairs', tags: ['Solar panels', 'Inverter', 'Maintenance'], icon: 'sunny', color: 'tints.yellow' },
  { id: 'bikeMechanic', name: 'Bike Mechanic', category: 'More Services', tags: ['Bike repair', 'Service', 'Tuning'], icon: 'bicycle', color: 'tints.blue' },
  { id: 'lockerService', name: 'Locker Service', category: 'More Services', tags: ['Storage', 'Packing', 'Pickup'], icon: 'lock-closed', color: 'tints.purple' },
  { id: 'cleaningConsultant', name: 'Cleaning Consultant', category: 'Daily Help', tags: ['Sanitization', 'Process', 'Checklist'], icon: 'checkmark-done-circle', color: 'tints.rose' }
];

async function main() {
  console.log(`Seeding ${dummyServices.length} dummy services into the database...`);
  await prisma.$transaction(
    dummyServices.map((service) =>
      prisma.service.upsert({
        where: { id: service.id },
        update: service,
        create: service,
      })
    )
  );
  console.log('✔️ Dummy services seeded successfully');
}

main()
  .catch((error) => {
    console.error('Failed to seed dummy services:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
