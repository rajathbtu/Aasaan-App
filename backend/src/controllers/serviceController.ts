import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getReqLang, t } from '../utils/i18n';

// Default services to seed when DB is empty
const defaultServices: Array<{ id: string; name: string; category: string; tags: string[]; icon: string; color: string }> = [
  // Daily Help
  { id: 'maid', name: 'Maid', category: 'Daily Help', tags: ['Cleaning', 'Sweeping'], icon: 'construct', color: 'tints.purple' },
  { id: 'cook', name: 'Cook', category: 'Daily Help', tags: ['Meal prep'], icon: 'restaurant', color: 'tints.emeraldSoft' },
  { id: 'babysitter', name: 'Babysitter', category: 'Daily Help', tags: ['Child care'], icon: 'person', color: 'tints.amber' },
  { id: 'cleaner', name: 'Cleaner', category: 'Daily Help', tags: ['Deep cleaning', 'Kitchen', 'Bathroom', 'Bedroom'], icon: 'sparkles', color: 'tints.sky' },
  { id: 'servant', name: 'Home Servant', category: 'Daily Help', tags: ['General help', 'Elderly care', 'Groceries'], icon: 'people', color: 'tints.purple' },
  { id: 'carCleaner', name: 'Car Cleaner', category: 'Daily Help', tags: ['Interior clean', 'Exterior wash', 'Wax'], icon: 'car', color: 'tints.rose' },
  // Home Repairs
  { id: 'electrician', name: 'Electrician', category: 'Home Repairs', tags: ['Fan repair', 'Switch board', 'Light fixture', 'Wiring issue', 'MCB', 'Urgent', 'Home visit'], icon: 'flash', color: 'tints.blue' },
  { id: 'plumber', name: 'Plumber', category: 'Home Repairs', tags: ['Leaky tap', 'Pipe burst', 'Blockage', 'Water heater', 'Toilet'], icon: 'water', color: 'tints.sky' },
  { id: 'carpenter', name: 'Carpenter', category: 'Home Repairs', tags: ['Furniture repair', 'Woodwork', 'Door hinge', 'Custom shelves'], icon: 'hammer', color: 'tints.amber' },
  { id: 'painter', name: 'Painter', category: 'Home Repairs', tags: ['Interior painting', 'Exterior painting', 'Primer', 'Texture'], icon: 'color-palette', color: 'tints.rose' },
  { id: 'acRepair', name: 'AC Repair', category: 'Home Repairs', tags: ['Air conditioning', 'Gas refill', 'Maintenance', 'Compressor'], icon: 'snow', color: 'tints.sky' },
  { id: 'pestControl', name: 'Pest Control', category: 'Home Repairs', tags: ['Termites', 'Cockroaches', 'Mosquitoes', 'Rodents'], icon: 'bug', color: 'tints.orange' },
  { id: 'geyserRepair', name: 'Geyser Repair', category: 'Home Repairs', tags: ['No heating', 'Leaking', 'Installation'], icon: 'flame', color: 'tints.amber' },
  { id: 'washingMachineRepair', name: 'Washing Machine Repair', category: 'Home Repairs', tags: ['Not spinning', 'Water leak', 'Noise'], icon: 'refresh-circle', color: 'tints.sky' },
  { id: 'refrigeratorRepair', name: 'Refrigerator Repair', category: 'Home Repairs', tags: ['Not cooling', 'Gas refill', 'Noise'], icon: 'snow', color: 'tints.blue' },
  { id: 'microwaveRepair', name: 'Microwave Repair', category: 'Home Repairs', tags: ['No heating', 'Turntable', 'Sparking'], icon: 'flash', color: 'tints.roseSoft' },
  { id: 'waterPurifier', name: 'Water Purifier Service', category: 'Home Repairs', tags: ['Filter change', 'Installation', 'No flow'], icon: 'water', color: 'tints.sky' },
  { id: 'cctv', name: 'CCTV Installation', category: 'Home Repairs', tags: ['New install', 'DVR', 'Camera not working'], icon: 'videocam', color: 'tints.purple' },
  { id: 'chimneyCleaning', name: 'Kitchen Chimney Service', category: 'Home Repairs', tags: ['Deep cleaning', 'Noise', 'Oil leak'], icon: 'flame', color: 'tints.orange' },
  // Professional Services
  { id: 'photographer', name: 'Photographer', category: 'Professional Services', tags: ['Wedding', 'Portrait', 'Product', 'Outdoor'], icon: 'camera', color: 'tints.purple' },
  { id: 'yogaTrainer', name: 'Yoga Trainer', category: 'Professional Services', tags: ['Power yoga', 'Hatha', 'Beginner', 'Meditation'], icon: 'heart', color: 'tints.green' },
  { id: 'tutor', name: 'Tutor', category: 'Professional Services', tags: ['Maths', 'Science', 'English', 'Exam prep'], icon: 'book', color: 'tints.indigo' },
  { id: 'dietician', name: 'Dietician', category: 'Professional Services', tags: ['Weight loss', 'Diabetes', 'Child nutrition', 'Sports'], icon: 'leaf', color: 'tints.lime' },
  { id: 'makeupArtist', name: 'Makeup Artist', category: 'Professional Services', tags: ['Bridal', 'Party', 'Photo shoot', 'Fashion'], icon: 'brush', color: 'tints.purple' },
  { id: 'eventPlanner', name: 'Event Planner', category: 'Professional Services', tags: ['Wedding', 'Corporate', 'Birthday', 'Decoration'], icon: 'calendar', color: 'tints.amber' },
  { id: 'laptopRepair', name: 'Laptop Repair', category: 'Professional Services', tags: ['Screen', 'Battery', 'Slow performance'], icon: 'laptop', color: 'tints.indigo' },
  { id: 'mobileRepair', name: 'Mobile Repair', category: 'Professional Services', tags: ['Screen', 'Battery', 'Charging port'], icon: 'phone-portrait', color: 'tints.indigo' },
  // More Services
  { id: 'gardener', name: 'Gardener', category: 'More Services', tags: ['Lawn care', 'Planting', 'Trimming', 'Landscaping'], icon: 'flower', color: 'tints.green' },
  { id: 'caterer', name: 'Caterer', category: 'More Services', tags: ['Buffet', 'Veg', 'Non-veg', 'Custom menu'], icon: 'fast-food', color: 'tints.amber' },
  { id: 'interiorDesigner', name: 'Interior Designer', category: 'More Services', tags: ['Living room', 'Bedroom', 'Kitchen', 'Consultation'], icon: 'home', color: 'tints.indigo' },
  { id: 'sofaCleaning', name: 'Sofa Cleaning', category: 'More Services', tags: ['Shampoo', 'Stain removal', 'Fabric care'], icon: 'construct', color: 'tints.purple' },
  { id: 'carpetCleaning', name: 'Carpet Cleaning', category: 'More Services', tags: ['Deep clean', 'Stain removal', 'Deodorize'], icon: 'sparkles', color: 'tints.greenSoft' },
  { id: 'packersMovers', name: 'Packers & Movers', category: 'More Services', tags: ['House shifting', 'Local', 'Intercity'], icon: 'cube', color: 'tints.indigo' },
  { id: 'salonAtHome', name: 'Salon at Home', category: 'More Services', tags: ['Waxing', 'Facial', 'Haircut', 'Threading'], icon: 'cut', color: 'tints.pink' },
];

export async function listServices(req: Request, res: Response) {
  try {
    const pAny = prisma as any;
    const count = await pAny.service.count();
    if (count === 0) {
      await pAny.$transaction(
        defaultServices.map((s: any) =>
          pAny.service.upsert({
            where: { id: s.id },
            update: {},
            create: {
              id: s.id,
              name: s.name,
              category: s.category,
              tags: s.tags,
              icon: s.icon,
              color: s.color,
            },
          })
        )
      );
    }
    const items = await pAny.service.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    res.json({ services: items, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    const lang = getReqLang(req);
    res.status(500).json({ message: t(lang, 'services.fetchFailed'), error: err.message });
  }
}
