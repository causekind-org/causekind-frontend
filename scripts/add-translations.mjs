import fs from 'fs';
import path from 'path';

const newTranslations = {
  "HeroStateA": {
    "postWhatYouNeed": "Post what you need.",
    "connectWithGivers": "Connect with givers nearby.",
    "startYourApp": "Start your application",
    "viewAppStatus": "View application status",
    "fixDocuments": "Fix your documents",
    "startDrive": "Start a Drive",
    "legallyVerified": "Legally Verified",
    "agreedHandover": "Agreed Handover",
    "receiptPhotos": "Receipt Photos",
    "matchedNearYou": "Matched Near You",
    "illustrativeJourney": "Illustrative Journey",
    "sample": "Sample"
  },
  "SoundFamiliar": {
    "title": "Sound familiar?",
    "theCauseKindWay": "The CauseKind Way",
    "driveTitle": "Winter Blanket Drive",
    "driveSubtitle": "Verified NGO • 10km radius",
    "pledged": "{count} Pledged",
    "needed": "{count} Needed",
    "usual1": "Post on WhatsApp groups and hope",
    "usual2": "Donors aren't sure you're real",
    "usual3": "You get things you didn't ask for",
    "usual4": "No record of who gave what",
    "causeKind1": "Reviewed drives can reach nearby donors",
    "causeKind2": "Your Verified badge proves it",
    "causeKind3": "Review offers against your listed needs",
    "causeKind4": "Handovers are tracked through completion checks"
  },
  "Journey": {
    "title": "What happens after you post",
    "chapter1": "Post your Drive",
    "desc1": "List exactly what you need. A clean card is generated.",
    "chapter2": "Local Donors Notified",
    "desc2": "Donors within 10km are pinged on the map.",
    "chapter3": "Secure Handover",
    "desc3": "Donors drop off items. You share a secure OTP.",
    "chapter4": "Upload Proof",
    "desc4": "Snap a photo of the received items.",
    "chapter5": "Certificate Issued",
    "desc5": "The donor gets a verified impact certificate.",
    "replay": "Replay journey"
  },
  "Scan": {
    "title": "What we check at every step",
    "subtitle": "Our multi-step verification process ensures that only genuine, registered NGOs can connect with givers. We manually review every document.",
    "item1": "Trust Deed / Registration Certificate",
    "item2": "Valid 12A / 80G Certificates",
    "item3": "Identity of the Authorized Person",
    "item4": "Recent Bank Statements",
    "aiScreening": "AI Screening",
    "aiScreeningDesc": "Highlights critical text and extracts dates",
    "legalChecks": "Legal Checks",
    "legalChecksDesc": "Stamps a seal of authenticity",
    "localMatching": "Local Matching",
    "localMatchingDesc": "Drops a pin for geo-validation",
    "safeDropOffs": "Safe Drop-offs",
    "safeDropOffsDesc": "Ensures secure physical exchange locations",
    "proofRequired": "Proof Required",
    "proofRequiredDesc": "Verifies photographic evidence of items"
  },
  "Finale": {
    "title": "Get verified. Post. Deliver.",
    "checklistTitle": "Documents to keep ready",
    "timeEstimate": "Takes about 15 minutes",
    "check1": "Registration Certificate",
    "check2": "12A / 80G",
    "check3": "Bank Details",
    "check4": "Authorized ID",
    "support": "Need help? Contact NGO Support",
    "continuePill": "Continue Step {step}",
    "completePill": "Complete your profile"
  },
  "Faq": {
    "title": "Frequently Asked Questions",
    "q1": "Why can an application be sent back?",
    "a1": "Applications are often sent back if uploaded documents are blurry, expired, or if the name on the bank account does not perfectly match the registered NGO name. You will receive specific feedback on what needs to be fixed.",
    "q2": "How long does verification take?",
    "a2": "Our team manually reviews every application. Depending on volume, this typically takes 2-3 business days.",
    "q3": "What is the 10km radius rule?",
    "a3": "To ensure efficient and safe handovers, our platform prioritizes connecting you with local donors who live or work within 10km of your registered drop-off location."
  }
};

const messagesDir = path.join(process.cwd(), 'messages');
const files = fs.readdirSync(messagesDir);

for (const file of files) {
  if (file.endsWith('.json')) {
    const filePath = path.join(messagesDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!content.NgoLanding) {
      content.NgoLanding = {};
    }
    
    // Merge without overwriting existing NgoLanding keys unless we need to
    content.NgoLanding = { ...content.NgoLanding, ...newTranslations };
    
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`Updated ${file}`);
  }
}
