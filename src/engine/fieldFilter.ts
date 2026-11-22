import { normalize } from './normalize';
export interface FieldDescriptor {
  tag: string;
  type: string;
  autocomplete: string;
  labels: string;
  ariaLabel: string;
  placeholder: string;
  name: string;
  id: string;
  title: string;
  visible: boolean;
  disabled: boolean;
  readOnly: boolean;
  value: string;
  language: string;
}
export function exclusionReason(field: FieldDescriptor): string | undefined {
  if (!field.visible) return 'invisible';
  if (field.disabled || field.readOnly) return 'uneditable';
  if (
    field.tag === 'input' &&
    !['text', 'email', 'tel', 'url', 'date', 'number', 'radio'].includes(
      field.type,
    )
  )
    return 'unsupported-type';
  if (
    /(?:^|\s)(?:cc-[^\s]*|one-time-code|username|new-password|current-password)(?:\s|$)/i.test(
      field.autocomplete,
    )
  )
    return 'sensitive-autocomplete';
  const text = normalize(
    [
      field.labels,
      field.ariaLabel,
      field.placeholder,
      field.name,
      field.id,
      field.title,
    ].join(' '),
  );
  if (
    /\b(?:password|passcode|passwd|mot de passe|username|user name|user id|login|identifiant|pseudo|nom d utilisateur|carte|card|credit|debit|cvv|cvc|iban|bic|swift|security code|code de securite|otp|one time|verification code|code de verification|social security|ssn)\b/.test(
      text,
    )
  )
    return 'sensitive-field';
  if (
    /\b(?:creditcard|cardnumber|userlogin|userid|nomutilisateur)\b/.test(text)
  )
    return 'sensitive-field';
  return undefined;
}
