import type { DemoProfile } from './store';

const firstNames = ['Alex', 'Sofia', 'Tomas', 'Luz', 'Nico', 'Valen', 'Mora', 'Fran'];
const lastNames = ['Ejemplo', 'Muestra', 'Prueba', 'Ficticio', 'Demo', 'Imaginario'];
const streets = ['Avenida Ficticia', 'Calle de Muestra', 'Pasaje Imaginario', 'Boulevard de Prueba'];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function createDemoProfile(): DemoProfile {
  const date = new Date(1990 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 27));
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return {
    firstName: pick(firstNames),
    lastName: pick(lastNames),
    code: `DEMO-${suffix}`,
    birthDate: new Intl.DateTimeFormat('es-AR').format(date),
    address: `${pick(streets)} ${100 + Math.floor(Math.random() * 900)}, Ciudad Demo`,
  };
}
