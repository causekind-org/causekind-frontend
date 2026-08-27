/**
 * fix-blog-translation-glossary.mjs
 * Run: node scripts/fix-blog-translation-glossary.mjs [--dry]
 *
 * Repairs domain vocabulary in public/blog-translations/*.json.
 *
 * The free Google endpoint that produced these files has no notion of our
 * subject matter, so it handled "in-kind" two bad ways:
 *
 *   - Transliteration. Bengali/Gujarati/Kannada/Malayalam/Marathi/Punjabi/
 *     Tamil/Telugu got the English words respelled in native script
 *     ("ইন-কাইন্ড", "इन-काइंड"), which is noise to a reader who doesn't
 *     already know the English term — and that reader is the entire point of
 *     translating the page.
 *   - Mistranslation. Hindi produced "तरह-तरह से देना" ("giving various sorts
 *     of things") and Urdu "قسم میں دینا" ("giving in type/oath"). Both are
 *     simply wrong.
 *
 * Spanish, French and Arabic already had the correct idiom (dons en nature /
 * donaciones en especie / العطاء العيني) and are deliberately left alone.
 *
 * The replacement is the established native compound for donating goods —
 * "वस्तु दान" and its cognates — which is what the term means and what a donor
 * would actually search for.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, "../public/blog-translations");
const DRY = process.argv.includes("--dry");

/**
 * Applied to title, description and content.
 *
 * Order matters: longer phrases run first so a multi-word fix isn't pre-empted
 * by the single-token rule that follows it.
 *
 * The adjectival token replacement is safe because the transliteration only
 * ever appears qualifying a noun ("इन-काइंड दान", "इन-काइंड अनुरोध"), so
 * substituting the native adjective leaves the sentence grammatical.
 */
const TEXT_RULES = {
  hi: [["तरह-तरह से देना", "वस्तु दान"], ["इन-काइंड", "वस्तु"]],
  mr: [["इन-काइंड", "वस्तू"]],
  gu: [["ઇન-કાઇન્ડ", "વસ્તુ"]],
  bn: [["ইন কাইন্ড", "সামগ্রী"], ["ইন-কাইন্ড", "সামগ্রী"]],
  pa: [["ਇਨ-ਕਿੰਨਡ", "ਵਸਤੂ"], ["ਇਨ-ਕਾਇੰਡ", "ਵਸਤੂ"]],
  ta: [["இன்-கைண்ட் கிவிங்", "பொருள் தானம்"], ["இன்-கைண்ட்", "பொருள்"]],
  te: [["ఇన్-కైండ్", "వస్తు"]],
  kn: [["ಇನ್-ಕೈಂಡ್", "ವಸ್ತು"]],
  ml: [["ഇൻ-കൈൻഡ്", "വസ്തു"]],
  // Urdu's is a mistranslation rather than a transliteration, so both the
  // standalone label and the in-sentence form need their own phrasing.
  ur: [["قسم میں دینا", "سامان کا عطیہ"], ["قسم میں", "سامان کی صورت میں"]],
};

/**
 * Exact category labels, applied to the `category` field only.
 *
 * Two jobs here. First, the in-kind label. Second, consistency: the same
 * locale was given a different word for "donation" in different categories
 * (Kannada ದಾನ for clothing but ಕೊಡುಗೆ for electronics, Marathi दान vs देणगी,
 * Tamil தானம் vs நன்கொடை), which reads as sloppy on a card grid where the
 * labels sit side by side. These are pinned to one word per locale.
 *
 * Restricted to the category field on purpose — देणगी and நன்கொடை are perfectly
 * good words in running prose, and rewriting them there would be meddling.
 */
const CATEGORY_MAP = {
  hi: { "तरह-तरह से देना": "वस्तु दान", "वस्तु दान": "वस्तु दान", "वस्त्र दान": "वस्त्र दान", "इलेक्ट्रॉनिक्स दान": "इलेक्ट्रॉनिक्स दान" },
  mr: { "इन-काइंड देणे": "वस्तू दान", "वस्तू देणे": "वस्तू दान", "कपडे दान": "कपडे दान", "इलेक्ट्रॉनिक्स देणगी": "इलेक्ट्रॉनिक्स दान" },
  gu: { "ઇન-કાઇન્ડ આપવી": "વસ્તુ દાન", "વસ્તુ આપવી": "વસ્તુ દાન", "કપડાં દાન": "કપડાં દાન", "ઇલેક્ટ્રોનિક્સ દાન": "ઇલેક્ટ્રોનિક્સ દાન" },
  bn: { "ইন-কাইন্ড গিভিং": "সামগ্রী দান", "সামগ্রী গিভিং": "সামগ্রী দান", "পোশাক দান": "পোশাক দান", "ইলেকট্রনিক্স দান": "ইলেকট্রনিক্স দান" },
  pa: { "ਇਨ-ਕਿੰਨਡ ਦੇਣਾ": "ਵਸਤੂ ਦਾਨ", "ਵਸਤੂ ਦੇਣਾ": "ਵਸਤੂ ਦਾਨ", "ਕੱਪੜੇ ਦਾਨ": "ਕੱਪੜੇ ਦਾਨ", "ਇਲੈਕਟ੍ਰਾਨਿਕਸ ਦਾਨ": "ਇਲੈਕਟ੍ਰਾਨਿਕਸ ਦਾਨ" },
  ta: { "இன்-கைண்ட் கிவிங்": "பொருள் தானம்", "பொருள் தானம்": "பொருள் தானம்", "ஆடை தானம்": "ஆடை தானம்", "எலெக்ட்ரானிக்ஸ் நன்கொடை": "எலெக்ட்ரானிக்ஸ் தானம்" },
  te: { "ఇన్-కైండ్ గివింగ్": "వస్తు దానం", "వస్తు గివింగ్": "వస్తు దానం", "వస్త్రదానం": "వస్త్ర దానం", "ఎలక్ట్రానిక్స్ విరాళం": "ఎలక్ట్రానిక్స్ దానం" },
  kn: { "ಇನ್-ಕೈಂಡ್ ಗಿವಿಂಗ್": "ವಸ್ತು ದಾನ", "ವಸ್ತು ಗಿವಿಂಗ್": "ವಸ್ತು ದಾನ", "ಬಟ್ಟೆ ದಾನ": "ಬಟ್ಟೆ ದಾನ", "ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್ ಕೊಡುಗೆ": "ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್ ದಾನ" },
  ml: { "ഇൻ-കൈൻഡ് ഗിവിംഗ്": "വസ്തു ദാനം", "വസ്തു ഗിവിംഗ്": "വസ്തു ദാനം", "വസ്ത്ര ദാനം": "വസ്ത്ര ദാനം", "ഇലക്ട്രോണിക്സ് സംഭാവന": "ഇലക്ട്രോണിക്സ് ദാനം" },
  ur: { "قسم میں دینا": "سامان کا عطیہ", "سامان کا عطیہ": "سامان کا عطیہ", "لباس کا عطیہ": "لباس کا عطیہ", "الیکٹرانکس کا عطیہ": "الیکٹرانکس کا عطیہ" },
};

const TIPS_KEY = "__insider_tips__";

function applyRules(text, rules) {
  let out = text;
  let n = 0;
  for (const [from, to] of rules) {
    if (from === to) continue;
    const parts = out.split(from);
    if (parts.length > 1) {
      n += parts.length - 1;
      out = parts.join(to);
    }
  }
  return [out, n];
}

let grandTotal = 0;

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const locale = file.replace(".json", "");
  const rules = TEXT_RULES[locale];
  const cats = CATEGORY_MAP[locale];
  if (!rules && !cats) {
    console.log(`${locale.padEnd(3)} — already idiomatic, skipped`);
    continue;
  }

  const filePath = path.join(DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  let edits = 0;
  let catFixes = 0;

  for (const [slug, entry] of Object.entries(data)) {
    if (slug === TIPS_KEY) continue;

    for (const field of ["title", "description", "content"]) {
      if (typeof entry[field] !== "string") continue;
      const [next, n] = applyRules(entry[field], rules ?? []);
      entry[field] = next;
      edits += n;
    }

    if (cats && typeof entry.category === "string") {
      // Run the text rules first so a transliterated category collapses onto a
      // key the exact map knows, then pin it to the canonical label.
      const [normalised] = applyRules(entry.category, rules ?? []);
      const target = cats[entry.category] ?? cats[normalised] ?? normalised;
      if (target !== entry.category) catFixes++;
      entry.category = target;
    }
  }

  grandTotal += edits + catFixes;
  console.log(`${locale.padEnd(3)} — ${String(edits).padStart(4)} term fixes, ${catFixes} category labels`);

  if (!DRY) fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

console.log(`\n${DRY ? "[dry run] would change" : "changed"} ${grandTotal} strings`);
