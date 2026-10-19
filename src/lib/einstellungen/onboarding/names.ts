// Gängige Schreibvarianten von Vornamen – beim Bestätigen als Chips angeboten.

const GROUPS: string[][] = [
  ["Mathis", "Mattis", "Matthis", "Mathys"],
  ["Jonne", "Jonna"],
  ["Lea", "Leah"],
  ["Luca", "Luka", "Lucas", "Lukas"],
  ["Finn", "Fin"],
  ["Mia", "Miah"],
  ["Lena", "Leni"],
  ["Emma", "Ema"],
  ["Sophie", "Sofie", "Sophia", "Sofia"],
  ["Noah", "Noa"],
  ["Elias", "Elyas"],
  ["Ben", "Benn"],
  ["Jonas", "Jonah"],
  ["Luis", "Louis"],
  ["Hanna", "Hannah"],
  ["Anna", "Ana"],
  ["Marie", "Mari"],
  ["Nele", "Neele"],
  ["Matteo", "Mateo"],
  ["Henri", "Henry"],
  ["Kai", "Kay"],
  ["Jan", "Jann"],
  ["Tim", "Timm"],
  ["Tom", "Thom"],
  ["Niklas", "Niclas", "Nicklas"],
  ["Jannik", "Janik", "Yannick", "Yannik"],
  ["Malte", "Malthe"],
  ["Mika", "Mikka"],
  ["Clara", "Klara"],
  ["Carla", "Karla"],
  ["Katharina", "Katarina"],
  ["Stefan", "Stephan"],
  ["Christian", "Kristian"],
  ["Sarah", "Sara"],
  ["Philipp", "Phillip", "Filip"],
  ["Mathilda", "Matilda"],
  ["Johanna", "Joanna"],
  ["Elisa", "Elissa"],
  ["Emil", "Emiel"],
  ["Ida", "Ina"],
  ["Greta", "Gretha"],
  ["Lotta", "Lota"],
  ["Frieda", "Frida"],
  ["Paula", "Pola"],
  ["Mila", "Milla"],
  ["Leon", "Léon"],
  ["Theo", "Teo"],
  ["Ole", "Olle"],
];

/** Andere Schreibweisen desselben Namens (ohne den Namen selbst) */
export function nameVariants(name: string): string[] {
  const lower = name.trim().toLowerCase();
  const group = GROUPS.find((g) => g.some((n) => n.toLowerCase() === lower));
  return group ? group.filter((n) => n.toLowerCase() !== lower) : [];
}
