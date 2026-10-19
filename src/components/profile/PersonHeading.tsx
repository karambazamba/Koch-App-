import { PERSON_ICONS } from "@/components/form/NameField";
import { IconBadge } from "@/components/ui/IconBadge";
import { personLabel, personRoleLabel, type Person } from "@/lib/einstellungen/profile";

/** Überschrift einer Personen-Karte: Name (falls eingetragen) und Rolle. */
export function PersonHeading({ person, persons }: { person: Person; persons: Person[] }) {
  const name = personLabel(person, persons);
  const role = personRoleLabel(person, persons);
  return (
    <div className="flex items-center gap-3">
      <IconBadge icon={PERSON_ICONS[person.role]} />
      <div className="min-w-0">
        <h3 className="truncate text-xl font-extrabold tracking-tight">{name}</h3>
        {name !== role && <p className="text-sm text-muted">{role}</p>}
      </div>
    </div>
  );
}
