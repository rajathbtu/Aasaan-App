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

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let value = '';
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (isQuoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
    } else if (character === ',' && !isQuoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
};

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
  const headers = parseCsvLine(headerLine);

  return rowLines.map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
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

  const services = readDefaultServices();
  if (services.length === 0) {
    return;
  }

  await pAny.$transaction(
    services.map((service) =>
      pAny.service.upsert({
        where: { id: service.id },
        create: service,
        update: service,
      }),
    ),
  );
}