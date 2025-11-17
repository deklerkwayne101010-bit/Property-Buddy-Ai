// Admin utilities

const ADMIN_EMAILS = [
  'admin@example.com', // Replace with actual admin emails
  // Add more admin emails here
];

export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}