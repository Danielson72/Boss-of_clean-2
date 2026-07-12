/**
 * The exact SMS consent disclosure shown to pros.
 *
 * Imported by both the consent checkbox UI (setup + profile) and the server
 * action that records consent, so the persisted `pros.sms_consent_text` is
 * always byte-for-byte what the pro actually saw.
 *
 * Required TCPA / Florida FTSA elements, all present below:
 *  - automated text messages          ("automated text messages")
 *  - message frequency                ("Message frequency varies")
 *  - consent is not a condition        ("not a condition of using Boss of Clean")
 *  - msg/data rates apply              ("Message and data rates may apply")
 *  - how to opt out                    ("Reply STOP to opt out")
 */
export const PRO_SMS_CONSENT_TEXT =
  'I agree to receive automated text messages from Boss of Clean at the business ' +
  'phone number I provide, including new-lead and new-message alerts. Message ' +
  'frequency varies. Consent is not a condition of using Boss of Clean or ' +
  'receiving leads. Message and data rates may apply. Reply STOP to opt out at ' +
  'any time; reply HELP for help.';
