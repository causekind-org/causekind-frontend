"use client";

import { useState } from "react";
import Image from "next/image";

import Link, { useLinkStatus } from "next/link";
import { ArrowLeft, ArrowRight, HandHeart, Loader2, MessagesSquare, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { NewRequestLink } from "@/components/NewRequestLink";
import { DonateNowButton } from "@/components/donate/DonateNowButton";
import type { FulfilledNeedSummary, PublicItemRequest } from "@/lib/api";
import { loginUrlFor } from "@/lib/safeRedirect";
import styles from "./MobileVisualStory.module.css";

const SAHAS_PHOTOS = [
  { src: "/videos/posters/impact-1.webp", alt: "Volunteers handing supplies to a woman", title: "A helping hand.", caption: "Volunteers share supplies with a community member." },
  { src: "/videos/posters/impact-2.webp", alt: "A volunteer sitting beside a child", title: "A moment together.", caption: "A volunteer spends a cheerful moment with a child." },
  { src: "/videos/posters/impact-5.webp", alt: "A woman holding a child and a package of food supplies", title: "Food for a family.", caption: "A family receives food supplies during a distribution drive." },
  { src: "/videos/posters/impact-3.webp", alt: "A volunteer tying a band around a child's wrist", title: "A little care.", caption: "A volunteer shares a moment with a child." },
  { src: "/videos/posters/impact-4.webp", alt: "Volunteers tying colourful bands on children's wrists", title: "Small moments together.", caption: "Children and volunteers come together for an activity." },
];

const T = ({ children }: { children: string }) => <TranslatedText text={children} />;

function EntryNavigationStatus() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className={styles.entryPending} role="status">
      <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span className="sr-only"><T>Opening page</T></span>
    </span>
  ) : <ArrowRight className={styles.entryArrow} aria-hidden="true" />;
}

/** Mobile content below the existing shared hero. Desktop keeps its own tree. */
export function MobileVisualStory({ requests, fulfilledNeeds = [] }: { requests: PublicItemRequest[]; fulfilledNeeds?: FulfilledNeedSummary[] }) {
  const { user, isRestoring } = useAuth();
  const [photoIndex, setPhotoIndex] = useState(0);
  const photo = SAHAS_PHOTOS[photoIndex];
  const [entryNotice, setEntryNotice] = useState("");
  const role = (user?.role ?? "").replace(/^ROLE_/, "");
  const donee = role === "DONEE";
  const guest = !isRestoring && !user;
  const canGive = !isRestoring && (guest || role === "DONOR");
  const canRequest = !isRestoring && (guest || donee);
  const steps = donee
    ? [
        { Icon: Package, title: "Tell us what you need", body: "Complete your profile and add your need." },
        { Icon: MessagesSquare, title: "Review an offer", body: "When someone offers help, talk and agree on the details." },
        { Icon: HandHeart, title: "Receive the item", body: "Follow the steps to confirm you received it." },
      ]
    : [
        { Icon: Package, title: "Choose an item", body: "Find a need you can help with." },
        { Icon: MessagesSquare, title: "Talk and agree", body: "Arrange how to pass it on." },
        { Icon: HandHeart, title: "Give it to them", body: "Follow the steps to confirm receipt." },
      ];

  return (
    <div className={`${styles.root} lg:hidden`}>
      <section className={styles.entry} aria-labelledby="mobile-entry-heading">
        <h2 id="mobile-entry-heading"><T>How can we help today?</T></h2>
        <div className={styles.entryChoices}>
          {/* The guided tour's last step ("Ready to give?") anchors here.
              It used to live on MobileDoors' donor CTA; when MobileVisualStory
              replaced that component the anchor went with it, and since
              HomeClient renders AudiencePathwaysSection without `tourAnchors`,
              `guest-join` was left with NO target anywhere in the tree — the
              tour's final step had nothing to point at. It sits on the article
              rather than the link so it survives both branches below (guests get
              a Link, a signed-in donee gets a button). Exactly one anchor must
              exist: two, with one in a display:none tree, collapses the
              spotlight onto the invisible one.

              Gated on `guest` — which is `!isRestoring && !user`, the same test
              AudiencePathwaysSection uses — because this is a signup prompt. An
              unconditional anchor put it in front of signed-in donors and donees
              too, and left it present during the auth-restore frame. */}
          <article className={styles.entryChoice} data-tour={guest ? "guest-join" : undefined}>
            <Package aria-hidden="true" />
            <span><strong><T>List an item</T></strong><span><T>I have something to give</T></span></span>
            {canGive ? (
              <Link prefetch={true} href={guest ? loginUrlFor("/items/new") : "/items/new"} className={styles.entryLogin}>
                <T>{guest ? "Login as donor" : "List an item"}</T><EntryNavigationStatus />
              </Link>
            ) : (
              <button type="button" disabled={isRestoring} className={styles.entryLogin} onClick={() => setEntryNotice("To give an item, sign out from the menu and log in with your donor account.")}><T>Login as donor</T><ArrowRight aria-hidden="true" /></button>
            )}
          </article>
          <article className={styles.entryChoice}>
            <HandHeart aria-hidden="true" />
            <span><strong><T>Request an item</T></strong><span><T>I need something</T></span></span>
            {canRequest ? (
              <NewRequestLink prefetch={true} href={guest ? loginUrlFor("/requests/new") : "/requests/new"} className={styles.entryLogin}>
                <T>{guest ? "Login as donee" : "Request an item"}</T><EntryNavigationStatus />
              </NewRequestLink>
            ) : (
              <button type="button" disabled={isRestoring} className={styles.entryLogin} onClick={() => setEntryNotice("To request an item, sign out from the menu and log in with your donee account.")}><T>Login as donee</T><ArrowRight aria-hidden="true" /></button>
            )}
          </article>
        </div>
        {entryNotice && <p className={styles.entryNotice} role="status"><T>{entryNotice}</T></p>}
      </section>
      {fulfilledNeeds.length > 0 && (
        <section className={styles.section} aria-labelledby="mobile-fulfilled-heading">
          <span className={styles.kicker}><T>Completed on CauseKind</T></span>
          <h2 id="mobile-fulfilled-heading"><T>Help that reached someone.</T></h2>
          <ul className={styles.needs}>
            {fulfilledNeeds.slice(0, 3).map(summary => (
              <li key={summary.category}>
                <span className={styles.itemIcon}><HandHeart aria-hidden="true" /></span>
                <div><h3><T>{summary.category}</T></h3><p>{summary.needs} <T>{summary.needs === 1 ? "need fulfilled" : "needs fulfilled"}</T></p></div>
              </li>
            ))}
          </ul>
          <Link className={styles.textLink} href="/requests"><T>Help with another need</T><ArrowRight aria-hidden="true" /></Link>
        </section>
      )}
      <section className={styles.chapter} aria-labelledby="mobile-sahas-heading">
        <span className={styles.kicker}><T>Sahas Charitable Trust</T></span>
        <h2 id="mobile-sahas-heading"><T>Small moments. Real care.</T></h2>
        <figure className={styles.sahasFigure}>
          <div className={styles.sahasImage}>
            <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 639px) 100vw, 480px" />
          </div>
          <figcaption aria-live="polite" aria-atomic="true">
            <h3><T>{photo.title}</T></h3>
            <p><T>{photo.caption}</T></p>
          </figcaption>
        </figure>
        <div className={styles.photoControls}>
          <span>{String(photoIndex + 1).padStart(2, "0")} / {String(SAHAS_PHOTOS.length).padStart(2, "0")}</span>
          <div>
            <button type="button" aria-label="Previous photo" onClick={() => setPhotoIndex(i => (i - 1 + SAHAS_PHOTOS.length) % SAHAS_PHOTOS.length)}><ArrowLeft aria-hidden="true" /></button>
            <button type="button" aria-label="Next photo" onClick={() => setPhotoIndex(i => (i + 1) % SAHAS_PHOTOS.length)}><ArrowRight aria-hidden="true" /></button>
          </div>
        </div>
        <Link className={styles.textLink} href="/donate/money"><T>More about Sahas</T><ArrowRight aria-hidden="true" /></Link>
      </section>

      <section className={styles.section} aria-labelledby="mobile-needs-heading">
        <h2 id="mobile-needs-heading"><T>Someone needs what you have.</T></h2>
        {requests.length ? (
          <ul className={styles.needs}>
            {requests.slice(0, 3).map(need => (
              <li key={need.id}>
                <span className={styles.itemIcon}><Package aria-hidden="true" /></span>
                <div>
                  <h3><T>{need.title}</T></h3>
                  <p><T>{need.city}</T> · <T>{need.category}</T></p>
                  <Link className={styles.textLink} href={canGive ? (guest ? loginUrlFor(`/requests/${need.id}/offer`) : `/requests/${need.id}/offer`) : "/requests"}>
                    <T>{canGive ? "I can help" : "See needs"}</T><ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className={styles.empty}><T>No public needs to show right now. Please check again soon.</T></p>}
        <Link href="/requests" className={styles.textLink}><T>See all needs</T><ArrowRight aria-hidden="true" /></Link>
      </section>

      <section className={styles.section} aria-labelledby="mobile-steps-heading">
        <h2 id="mobile-steps-heading"><T>{donee ? "How to ask for help." : "How to give."}</T></h2>
        <ol className={styles.steps}>
          {steps.map(({ Icon, title, body }, i) => (
            <li key={title}><div className={styles.stepIcon}><Icon aria-hidden="true" /><span>{String(i + 1).padStart(2, "0")}</span></div><div><h3><T>{title}</T></h3><p><T>{body}</T></p></div></li>
          ))}
        </ol>
      </section>

      {canRequest && <section className={`${styles.section} ${styles.soft}`} aria-labelledby="mobile-ask-heading">
        <span className={styles.kicker}><T>Need a hand?</T></span>
        <h2 id="mobile-ask-heading"><T>Tell us what you need.</T></h2>
        <p><T>Books, clothes, or something for home. Start with your need.</T></p>
        <NewRequestLink href={guest ? loginUrlFor("/requests/new") : "/requests/new"} className={styles.button}><T>I need an item</T><ArrowRight aria-hidden="true" /></NewRequestLink>
      </section>}

      <section className={styles.section} aria-labelledby="mobile-help-heading">
        <h2 id="mobile-help-heading"><T>We’re here to help.</T></h2>
        <details><summary><T>Who can ask for an item?</T></summary><p><T>Create your profile and share your need. The team reviews your details.</T></p></details>
        <details><summary><T>Will I definitely get an item?</T></summary><p><T>It depends on whether someone can offer what you need.</T></p></details>
        <details><summary><T>What if something goes wrong?</T></summary><p><T>Report the problem from your donation page during the available issue window.</T></p></details>
      </section>

      <section className={`${styles.section} ${styles.closing}`} aria-labelledby="mobile-closing-heading">
        <h2 id="mobile-closing-heading"><T>A little help. A good place to start.</T></h2>
        <Link className={styles.button} href="/requests"><T>{donee ? "See community needs" : "Find someone to help"}</T><ArrowRight aria-hidden="true" /></Link>
        {canGive && <div className={styles.money}><p><T>Want to give money?</T></p><DonateNowButton size="sm" variant="outline" /></div>}
      </section>
    </div>
  );
}
