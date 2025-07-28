/**
 * Definition of all available services offered on the Aasaan platform.  Each
 * service belongs to a category and optionally defines a list of suggested
 * tags.  The tags help end users describe their issue more precisely when
 * creating a work request.  Service providers can select up to three
 * services during onboarding.  You can extend this list or localise the
 * labels without impacting the rest of the application.
 */
export interface Service {
  /** Stable identifier for the service. */
  id: string;
  /** Human friendly name of the service as displayed in the UI. */
  name: string;
  /** Top level category grouping similar services together. */
  category: string;
  /** Optional list of tags that describe common tasks within the service. */
  tags?: string[];
}

/**
 * All services organised by category.  When rendering service lists the
 * frontend groups services by this category field.  Adding new services
 * requires updating this file only.
 */
export const services: Service[] = [
  // Daily Help
  {
    id: 'maid',
    name: 'Maid',
    category: 'Daily Help',
    tags: ['Cleaning', 'Sweeping', 'Mopping', 'Dusting'],
  },
  {
    id: 'cook',
    name: 'Cook',
    category: 'Daily Help',
    tags: ['Meal prep', 'Vegetarian', 'Non‑vegetarian', 'Breakfast', 'Dinner'],
  },
  {
    id: 'babysitter',
    name: 'Babysitter',
    category: 'Daily Help',
    tags: ['Child care', 'Infant', 'After school', 'Weekend'],
  },
  {
    id: 'cleaner',
    name: 'Cleaner',
    category: 'Daily Help',
    tags: ['Deep cleaning', 'Kitchen', 'Bathroom', 'Bedroom'],
  },
  {
    id: 'servant',
    name: 'Home Servant',
    category: 'Daily Help',
    tags: ['General help', 'Elderly care', 'Groceries'],
  },
  {
    id: 'carCleaner',
    name: 'Car Cleaner',
    category: 'Daily Help',
    tags: ['Interior clean', 'Exterior wash', 'Wax'],
  },
  // Home Repairs
  {
    id: 'electrician',
    name: 'Electrician',
    category: 'Home Repairs',
    tags: ['Fan repair', 'Switch board', 'Light fixture', 'Wiring issue', 'MCB', 'Urgent', 'Home visit'],
  },
  {
    id: 'plumber',
    name: 'Plumber',
    category: 'Home Repairs',
    tags: ['Leaky tap', 'Pipe burst', 'Blockage', 'Water heater', 'Toilet'],
  },
  {
    id: 'carpenter',
    name: 'Carpenter',
    category: 'Home Repairs',
    tags: ['Furniture repair', 'Woodwork', 'Door hinge', 'Custom shelves'],
  },
  {
    id: 'painter',
    name: 'Painter',
    category: 'Home Repairs',
    tags: ['Interior painting', 'Exterior painting', 'Primer', 'Texture'],
  },
  {
    id: 'acRepair',
    name: 'AC Repair',
    category: 'Home Repairs',
    tags: ['Air conditioning', 'Gas refill', 'Maintenance', 'Compressor'],
  },
  {
    id: 'pestControl',
    name: 'Pest Control',
    category: 'Home Repairs',
    tags: ['Termites', 'Cockroaches', 'Mosquitoes', 'Rodents'],
  },
  // Professional Services
  {
    id: 'photographer',
    name: 'Photographer',
    category: 'Professional Services',
    tags: ['Wedding', 'Portrait', 'Product', 'Outdoor'],
  },
  {
    id: 'yogaTrainer',
    name: 'Yoga Trainer',
    category: 'Professional Services',
    tags: ['Power yoga', 'Hatha', 'Beginner', 'Meditation'],
  },
  {
    id: 'tutor',
    name: 'Tutor',
    category: 'Professional Services',
    tags: ['Maths', 'Science', 'English', 'Exam prep'],
  },
  {
    id: 'dietician',
    name: 'Dietician',
    category: 'Professional Services',
    tags: ['Weight loss', 'Diabetes', 'Child nutrition', 'Sports'],
  },
  {
    id: 'makeupArtist',
    name: 'Makeup Artist',
    category: 'Professional Services',
    tags: ['Bridal', 'Party', 'Photo shoot', 'Fashion'],
  },
  {
    id: 'eventPlanner',
    name: 'Event Planner',
    category: 'Professional Services',
    tags: ['Wedding', 'Corporate', 'Birthday', 'Decoration'],
  },
  // More Services
  {
    id: 'gardener',
    name: 'Gardener',
    category: 'More Services',
    tags: ['Lawn care', 'Planting', 'Trimming', 'Landscaping'],
  },
  {
    id: 'caterer',
    name: 'Caterer',
    category: 'More Services',
    tags: ['Buffet', 'Veg', 'Non‑veg', 'Custom menu'],
  },
  {
    id: 'interiorDesigner',
    name: 'Interior Designer',
    category: 'More Services',
    tags: ['Living room', 'Bedroom', 'Kitchen', 'Consultation'],
  },
];