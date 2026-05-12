import { redirect } from 'next/navigation';

export default function GradeLevelsRedirectPage() {
  redirect('/settings/education-stages');
}
