import {
  EMPTY_REPRESENTATIVE,
  IS_NGO_DEMO_MODE,
  allDocumentIdsForStructure,
  fieldText,
  isRepresentativeEmpty,
  normalizeDraftDocuments,
  normalizePan,
  type LegalStructure,
  type NGOFormState,
  type RepresentativeCard,
  type UploadedFile,
} from "@/features/ngo-registration/ngoRegistrationModel";
import type { NgoDraftDto, NgoRepresentativeDto, UploadedFileDto } from "@/lib/api";

export function toDto(file: UploadedFile | null): UploadedFileDto | null {
  if (!file) return null;
  return {
    documentId: file.documentId ?? null,
    photoId: file.photoId ?? null,
    name: file.name,
    key: file.s3Key ?? null,
    url: file.s3Url ?? null,
    size: file.size ?? null,
    mimeType: file.mimeType ?? null,
    demo: file.demo ?? false,
  };
}

export function fromDto(dto: UploadedFileDto | null | undefined): UploadedFile | null {
  if (!dto) return null;
  // A saved reference with no upload id is not a file the backend will attach, so
  // showing it as uploaded would only hide that it has to be uploaded again.
  if (!IS_NGO_DEMO_MODE && dto.documentId == null && dto.photoId == null) return null;
  return {
    name: dto.name || "Uploaded document",
    documentId: dto.documentId ?? undefined,
    photoId: dto.photoId ?? undefined,
    s3Key: dto.key ?? undefined,
    s3Url: dto.url ?? undefined,
    size: dto.size ?? undefined,
    mimeType: dto.mimeType ?? undefined,
    demo: dto.demo ?? false,
  };
}

function representativeToDto(card: RepresentativeCard): NgoRepresentativeDto {
  return {
    fullName: fieldText(card.fullName),
    designation: fieldText(card.designation),
    mobileNumber: fieldText(card.mobileNumber),
    email: fieldText(card.email),
    panNumber: normalizePan(card.panNumber),
    idProof: toDto(card.idProof),
  };
}

export function representativeFromDto(dto: NgoRepresentativeDto): RepresentativeCard {
  return {
    fullName: fieldText(dto.fullName),
    designation: fieldText(dto.designation),
    mobileNumber: fieldText(dto.mobileNumber),
    email: fieldText(dto.email),
    panNumber: fieldText(dto.panNumber),
    idProof: fromDto(dto.idProof),
    emailVerified: dto.emailVerified === true,
  };
}

/** Only the documents of the chosen structure's lists (steps 1 and 2). */
function documentsFor(structure: LegalStructure, documents: Record<string, UploadedFile | null>) {
  const ids = new Set(allDocumentIdsForStructure(structure));
  const out: Record<string, UploadedFileDto | null> = {};
  for (const [id, file] of Object.entries(documents)) {
    if (ids.has(id)) out[id] = toDto(file);
  }
  return out;
}

/** Card 1 always; other cards only when something is filled in. */
function filledRepresentatives(form: NGOFormState): RepresentativeCard[] {
  const reps = form.representatives?.length ? form.representatives : [EMPTY_REPRESENTATIVE];
  return reps.filter((card, i) => i === 0 || !isRepresentativeEmpty(card));
}

/** What "Save draft" sends: every field, including cards still being filled in. */
export function buildDraftPayload(form: NGOFormState, currentStep: string): Partial<NgoDraftDto> {
  const documents: Record<string, UploadedFileDto | null> = {};
  for (const [id, file] of Object.entries(form.documents)) documents[id] = toDto(file);
  return {
    currentStep,
    organizationName: form.organizationName,
    legalStructure: form.legalStructure,
    panNumber: normalizePan(form.panNumber),
    registrationNumber: form.registrationNumber,
    registeredOfficeAddress: form.registeredOfficeAddress,
    organizationPhone: fieldText(form.organizationPhone),
    aboutUs: (form.aboutUs ?? "").trim(),
    yearOfEstablishment: form.yearOfEstablishment,
    representatives: (form.representatives ?? []).map(representativeToDto),
    confirmationChecked: form.confirmationChecked,
    authorizationLetter: toDto(form.authorizationLetter),
    documents,
    logo: toDto(form.logo),
    officePhoto: toDto(form.officePhoto),
    activityPhotos: form.activityPhotos.map(toDto),
  };
}

/** The submit request. Representative 1 is also the contact person (their email is the official email). */
export function buildSubmitPayload(form: NGOFormState) {
  const reps = filledRepresentatives(form);
  const first = reps[0] ?? EMPTY_REPRESENTATIVE;
  return {
    organizationName: form.organizationName,
    legalStructure: form.legalStructure,
    panNumber: normalizePan(form.panNumber),
    registrationNumber: form.registrationNumber,
    registeredOfficeAddress: form.registeredOfficeAddress,
    organizationPhone: fieldText(form.organizationPhone),
    aboutUs: (form.aboutUs ?? "").trim(),
    yearOfEstablishment: form.yearOfEstablishment,
    representativeName: fieldText(first.fullName),
    designation: fieldText(first.designation),
    mobileNumber: fieldText(first.mobileNumber),
    officialEmail: fieldText(first.email),
    representatives: reps.map(representativeToDto),
    confirmationChecked: form.confirmationChecked,
    authorizationLetter: toDto(form.authorizationLetter),
    documents: documentsFor(form.legalStructure, form.documents),
    logo: toDto(form.logo),
    officePhoto: toDto(form.officePhoto),
    activityPhotos: form.activityPhotos.map(toDto),
  };
}

/** A saved draft (or a restored application) applied over the current form. */
export function applyDraft(prev: NGOFormState, draft: NgoDraftDto): NGOFormState {
  const restoredDocs: Record<string, UploadedFile | null> = {};
  for (const [key, dto] of Object.entries(normalizeDraftDocuments(draft.documents ?? {}))) {
    restoredDocs[key] = fromDto(dto);
  }
  const reps = (draft.representatives ?? []).slice(0, 5).map(representativeFromDto);
  return {
    ...prev,
    organizationName: fieldText(draft.organizationName) || prev.organizationName,
    legalStructure: (draft.legalStructure as LegalStructure) || prev.legalStructure,
    panNumber: fieldText(draft.panNumber) || prev.panNumber,
    registrationNumber: fieldText(draft.registrationNumber) || prev.registrationNumber,
    registeredOfficeAddress: fieldText(draft.registeredOfficeAddress) || prev.registeredOfficeAddress,
    organizationPhone: fieldText(draft.organizationPhone) || fieldText(draft.mobileNumber) || prev.organizationPhone,
    aboutUs: typeof draft.aboutUs === "string" && draft.aboutUs ? draft.aboutUs : prev.aboutUs,
    yearOfEstablishment: fieldText(draft.yearOfEstablishment) || prev.yearOfEstablishment,
    representatives: reps.length > 0 ? reps : prev.representatives,
    representativeName: fieldText(draft.representativeName) || prev.representativeName,
    designation: draft.designation || prev.designation,
    mobileNumber: fieldText(draft.mobileNumber) || prev.mobileNumber,
    officialEmail: fieldText(draft.officialEmail) || prev.officialEmail,
    authorizationLetter: fromDto(draft.authorizationLetter) || prev.authorizationLetter,
    logo: fromDto(draft.logo) || prev.logo,
    officePhoto: fromDto(draft.officePhoto) || prev.officePhoto,
    activityPhotos:
      draft.activityPhotos && draft.activityPhotos.length > 0
        ? [0, 1, 2].map((i) => fromDto(draft.activityPhotos?.[i]))
        : prev.activityPhotos,
    confirmationChecked: draft.confirmationChecked ?? prev.confirmationChecked,
    documents: { ...prev.documents, ...restoredDocs },
  };
}
