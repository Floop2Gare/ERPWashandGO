export const buildGmailComposeUrl = ({
  to,
  subject,
  body,
}: {
  to: string[];
  subject: string;
  body: string;
}) => {
  const recipients = encodeURIComponent(to.join(','));
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${recipients}&su=${encodedSubject}&body=${encodedBody}`;
};

export const openEmailComposer = ({
  to,
  subject,
  body,
}: {
  to: string[];
  subject: string;
  body: string;
}) => {
  if (typeof window === 'undefined') {
    return false;
  }

  const gmailUrl = buildGmailComposeUrl({ to, subject, body });
  const popup = window.open(gmailUrl, '_blank', 'noopener,noreferrer');

  if (popup) {
    return true;
  }

  const mailtoUrl = `mailto:${encodeURIComponent(to.join(','))}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
  return false;
};
