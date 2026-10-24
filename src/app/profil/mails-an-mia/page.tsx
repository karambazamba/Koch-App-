import { MailsAnMiaView } from "@/components/mails/MailsAnMiaView";
import { APP_NAME } from "@/lib/core/app";

export const metadata = { title: `Mails an ${APP_NAME}` };

export default function Page() {
  return <MailsAnMiaView />;
}
