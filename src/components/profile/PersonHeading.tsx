import { personLabel, personRoleLabel, type Person } from "@/lib/profile";

/** Überschrift einer Personen-Karte: Name (falls eingetragen) und Rolle. */
export function PersonHeading({ person, persons }: { person: Person; persons: Person[] }) {
  const name = personLabel(person, persons);
  const role = personRoleLabel(person, persons);
  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl" aria-hidden>
        {person.role === "erwachsen" ? "🧑" : "🧒"}
      </span>
      <div className="min-w-0">
        <h3 className="truncate text-xl font-extrabold">{name}</h3>
        {name !== role && <p className="text-sm text-stone-500">{role}</p>}
      </div>
    </div>
  );
}
