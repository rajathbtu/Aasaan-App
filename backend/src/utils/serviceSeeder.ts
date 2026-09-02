import fs from 'fs';
import path from 'path';
import prisma from './prisma';

export type DefaultService = {
  id: string;
  name: string;
  category: string;
  alias: string[];
  tags: string[];
  icon: string;
  color: string;
};

const splitList = (value = '') =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const findCsvPath = () => {
  const candidates = [
    path.resolve(__dirname, 'Aasaan_Services_Master.csv'),
    path.resolve(__dirname, '..', 'src', 'utils', 'Aasaan_Services_Master.csv'),
    path.resolve(process.cwd(), 'src', 'utils', 'Aasaan_Services_Master.csv'),
    path.resolve(process.cwd(), 'Aasaan_Services_Master.csv'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
};

const readDefaultServices = (): DefaultService[] => {
  const csvPath = findCsvPath();
  if (!csvPath) {
    return [];
  }

  const text = fs.readFileSync(csvPath, 'utf8');
  const [headerLine, ...rowLines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',').map((header) => header.trim());

  return rowLines.map((line) => {
    const values = line.match(/("[^"]*(?:""[^"]*)*"|[^,]+)/g) ?? [];
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      const raw = (values[index] ?? '').trim();
      record[header] = raw.replace(/^"|"$/g, '').replace(/""/g, '"');
    });

    return {
      id: record.Service_id,
      name: record.Service_name,
      category: record.Category_name || record.Category || '',
      alias: splitList(record.Alias),
      tags: splitList(record.Tags),
      icon: record.Icon || 'construct',
      color: record.Icon_color || '#4CAF50',
    };
  });
};

export const defaultServices: DefaultService[] = readDefaultServices();

export async function syncServices(): Promise<void> {
  const pAny = prisma as any;

  const hasServices = (await pAny.service.count()) > 0;
  if (hasServices) {
    return;
  }

  const services = readDefaultServices();
  if (services.length === 0) {
    return;
  }

  await pAny.service.createMany({
    data: services,
    skipDuplicates: true,
  });
}