# Manual acceptance worksheet

These are **candidate URLs, not verified test results**. No live form has been filled or submitted during implementation. Authentication, consent, geography and site changes may affect availability. Use synthetic details, stop before any submission, purchase or account creation, and record observed matches and exclusions. Do not put real personal information into test sites. The 90% acceptance target is not established until this worksheet is completed.

| #   | Candidate form                                                                                  | Type                                             | Observed result |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------- |
| 1   | https://www.selenium.dev/selenium/web/web-form.html                                             | Mixed controls                                   | Not tested      |
| 2   | https://demo.playwright.dev/todomvc/                                                            | Controlled text input                            | Not tested      |
| 3   | https://www.w3schools.com/html/html_forms.asp                                                   | Basic names                                      | Not tested      |
| 4   | https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Your_first_form | Contact example                                  | Not tested      |
| 5   | https://www.service-public.fr/                                                                  | French public service (choose a public form)     | Not tested      |
| 6   | https://www.laposte.fr/                                                                         | French address / delivery (choose a public form) | Not tested      |
| 7   | https://www.sncf-connect.com/                                                                   | French travel details                            | Not tested      |
| 8   | https://www.decathlon.fr/                                                                       | French checkout/address (stop before purchase)   | Not tested      |
| 9   | https://www.fnac.com/                                                                           | French account/address                           | Not tested      |
| 10  | https://www.ikea.com/fr/fr/                                                                     | French contact/address                           | Not tested      |
| 11  | https://www.amazon.fr/                                                                          | French shipping address (login may be required)  | Not tested      |
| 12  | https://www.linkedin.com/                                                                       | Professional application/contact                 | Not tested      |
| 13  | https://www.indeed.com/                                                                         | Job application                                  | Not tested      |
| 14  | https://www.wikipedia.org/                                                                      | Search should remain unfilled                    | Not tested      |
| 15  | https://github.com/signup                                                                       | Registration with username exclusions            | Not tested      |
| 16  | https://www.mozilla.org/en-US/newsletter/                                                       | English newsletter and country                   | Not tested      |
| 17  | https://www.unicef.org/                                                                         | Donation form; payment exclusions                | Not tested      |
| 18  | https://www.redcross.org/                                                                       | Contact/donation; payment exclusions             | Not tested      |
| 19  | https://www.booking.com/                                                                        | Travel/contact; date ambiguity                   | Not tested      |
| 20  | https://www.paypal.com/                                                                         | Financial registration; sensitive exclusions     | Not tested      |

For each visited page record: actual URL/date/browser, eligible visible controls, correctly filled controls, false matches, sensitive controls untouched, framework validation state, undo result, and whether any request originated from extension code. Calculate correct / eligible across sites, excluding unsupported/sensitive controls. Never infer a pass from the mere presence of a DOM value. Real-world checks and manual keyboard/screen-reader/contrast review remain release gates.
