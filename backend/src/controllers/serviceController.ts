import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Default services to seed when DB is empty
const defaultServices: Array<{ id: string; name: string; category: string; tags: string[] }> = [
  // Daily Help
  { id: 'maid', name: 'Maid', category: 'Daily Help', tags: ['Cleaning', 'Sweeping', 'Mopping', 'Dusting'] },
  { id: 'cook', name: 'Cook', category: 'Daily Help', tags: ['Meal prep', 'Vegetarian', 'Non-veg', 'Breakfast', 'Dinner'] },
  { id: 'babysitter', name: 'Babysitter', category: 'Daily Help', tags: ['Child care', 'Infant', 'After school', 'Weekend'] },
  { id: 'cleaner', name: 'Cleaner', category: 'Daily Help', tags: ['Deep cleaning', 'Kitchen', 'Bathroom', 'Bedroom'] },
  { id: 'servant', name: 'Home Servant', category: 'Daily Help', tags: ['General help', 'Elderly care', 'Groceries'] },
  { id: 'carCleaner', name: 'Car Cleaner', category: 'Daily Help', tags: ['Interior clean', 'Exterior wash', 'Wax'] },
  // Home Repairs
  { id: 'electrician', name: 'Electrician', category: 'Home Repairs', tags: ['Fan repair', 'Switch board', 'Light fixture', 'Wiring issue', 'MCB', 'Urgent', 'Home visit'] },
  { id: 'plumber', name: 'Plumber', category: 'Home Repairs', tags: ['Leaky tap', 'Pipe burst', 'Blockage', 'Water heater', 'Toilet'] },
  { id: 'carpenter', name: 'Carpenter', category: 'Home Repairs', tags: ['Furniture repair', 'Woodwork', 'Door hinge', 'Custom shelves'] },
  { id: 'painter', name: 'Painter', category: 'Home Repairs', tags: ['Interior painting', 'Exterior painting', 'Primer', 'Texture'] },
  { id: 'acRepair', name: 'AC Repair', category: 'Home Repairs', tags: ['Air conditioning', 'Gas refill', 'Maintenance', 'Compressor'] },
  { id: 'pestControl', name: 'Pest Control', category: 'Home Repairs', tags: ['Termites', 'Cockroaches', 'Mosquitoes', 'Rodents'] },
  { id: 'geyserRepair', name: 'Geyser Repair', category: 'Home Repairs', tags: ['No heating', 'Leaking', 'Installation'] },
  { id: 'washingMachineRepair', name: 'Washing Machine Repair', category: 'Home Repairs', tags: ['Not spinning', 'Water leak', 'Noise'] },
  { id: 'refrigeratorRepair', name: 'Refrigerator Repair', category: 'Home Repairs', tags: ['Not cooling', 'Gas refill', 'Noise'] },
  { id: 'microwaveRepair', name: 'Microwave Repair', category: 'Home Repairs', tags: ['No heating', 'Turntable', 'Sparking'] },
  { id: 'waterPurifier', name: 'Water Purifier Service', category: 'Home Repairs', tags: ['Filter change', 'Installation', 'No flow'] },
  { id: 'cctv', name: 'CCTV Installation', category: 'Home Repairs', tags: ['New install', 'DVR', 'Camera not working'] },
  { id: 'chimneyCleaning', name: 'Kitchen Chimney Service', category: 'Home Repairs', tags: ['Deep cleaning', 'Noise', 'Oil leak'] },
  // Professional Services
  { id: 'photographer', name: 'Photographer', category: 'Professional Services', tags: ['Wedding', 'Portrait', 'Product', 'Outdoor'] },
  { id: 'yogaTrainer', name: 'Yoga Trainer', category: 'Professional Services', tags: ['Power yoga', 'Hatha', 'Beginner', 'Meditation'] },
  { id: 'tutor', name: 'Tutor', category: 'Professional Services', tags: ['Maths', 'Science', 'English', 'Exam prep'] },
  { id: 'dietician', name: 'Dietician', category: 'Professional Services', tags: ['Weight loss', 'Diabetes', 'Child nutrition', 'Sports'] },
  { id: 'makeupArtist', name: 'Makeup Artist', category: 'Professional Services', tags: ['Bridal', 'Party', 'Photo shoot', 'Fashion'] },
  { id: 'eventPlanner', name: 'Event Planner', category: 'Professional Services', tags: ['Wedding', 'Corporate', 'Birthday', 'Decoration'] },
  { id: 'laptopRepair', name: 'Laptop Repair', category: 'Professional Services', tags: ['Screen', 'Battery', 'Slow performance'] },
  { id: 'mobileRepair', name: 'Mobile Repair', category: 'Professional Services', tags: ['Screen', 'Battery', 'Charging port'] },
  // More Services
  { id: 'gardener', name: 'Gardener', category: 'More Services', tags: ['Lawn care', 'Planting', 'Trimming', 'Landscaping'] },
  { id: 'caterer', name: 'Caterer', category: 'More Services', tags: ['Buffet', 'Veg', 'Non-veg', 'Custom menu'] },
  { id: 'interiorDesigner', name: 'Interior Designer', category: 'More Services', tags: ['Living room', 'Bedroom', 'Kitchen', 'Consultation'] },
  { id: 'sofaCleaning', name: 'Sofa Cleaning', category: 'More Services', tags: ['Shampoo', 'Stain removal', 'Fabric care'] },
  { id: 'carpetCleaning', name: 'Carpet Cleaning', category: 'More Services', tags: ['Deep clean', 'Stain removal', 'Deodorize'] },
  { id: 'packersMovers', name: 'Packers & Movers', category: 'More Services', tags: ['House shifting', 'Local', 'Intercity'] },
  { id: 'salonAtHome', name: 'Salon at Home', category: 'More Services', tags: ['Waxing', 'Facial', 'Haircut', 'Threading'] },
];

export async function listServices(req: Request, res: Response) {
  try {
    const pAny = prisma as any;
    const count = await pAny.service.count();
    if (count === 0) {
      await pAny.$transaction(
        defaultServices.map((s: any) =>
          pAny.service.upsert({ where: { id: s.id }, update: {}, create: s })
        )
      );
    }
    const items = await pAny.service.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    res.json({ services: items, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to fetch services', error: err.message });
  }
}
