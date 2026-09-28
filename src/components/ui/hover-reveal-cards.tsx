import React from 'react';
import { cn } from '@/lib/utils';

/**
 * @typedef CardItem
 * @property {string | number} id - Unique identifier for the card.
 * @property {string} title - The main title text of the card.
 * @property {string} subtitle - The subtitle or category text.
 * @property {string} imageUrl - The URL for the card's background image.
 */
export interface CardItem {
  id: string | number;
  title: string;
  subtitle: string;
  imageUrl: string;
  /** Optional location/city */
  location?: string;
  /** Optional badge/role text */
  badgeText?: string;
  /** Optional badge variant */
  badgeVariant?: 'individual' | 'ngo' | 'urgent';
  /** Optional relative time */
  timeAgo?: string;
  /** Optional action URL */
  actionUrl?: string;
  /** Optional action button text */
  actionLabel?: string;
  /** Optional custom content renderer */
  customContent?: React.ReactNode;
}

/**
 * @typedef HoverRevealCardsProps
 * @property {CardItem[]} items - An array of card item objects to display.
 * @property {string} [className] - Optional additional class names for the container.
 * @property {string} [cardClassName] - Optional additional class names for individual cards.
 */
export interface HoverRevealCardsProps {
  items: CardItem[];
  className?: string;
  cardClassName?: string;
  renderCard?: (item: CardItem, index: number) => React.ReactNode;
}

/**
 * A component that displays a grid of cards with a hover-reveal effect.
 * When a card is hovered or focused, it stands out while others are de-emphasized.
 * (Blur replaced with opacity + scale for optimal performance and legibility)
 */
export const HoverRevealCards: React.FC<HoverRevealCardsProps> = ({
  items,
  className,
  cardClassName,
  renderCard,
}) => {
  return (
    // The `group` class on the container enables styling children on parent hover.
    <div
      role="list"
      className={cn(
        'group grid w-full max-w-6xl grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-4',
        className
      )}
    >
      {items.map((item, index) => {
        if (renderCard) {
          return renderCard(item, index);
        }

        return (
          <div
            key={item.id}
            role="listitem"
            aria-label={`${item.title}, ${item.subtitle}`}
            tabIndex={0} // Makes the div focusable for keyboard navigation.
            className={cn(
              'relative h-80 cursor-pointer overflow-hidden rounded-xl bg-cover bg-center shadow-lg transition-all duration-500 ease-in-out',
              // On parent hover (desktop hover-capable only), dim other cards with opacity & slight scale down
              '@media(hover:hover){group-hover:scale-[0.98] group-hover:opacity-60}',
              'hover:!scale-105 hover:!opacity-100 focus-visible:!scale-105 focus-visible:!opacity-100',
              // Accessibility: Add focus ring using theme variables.
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
              cardClassName
            )}
            style={{ backgroundImage: `url(${item.imageUrl})` }}
          >
            {/* Warm dark gradient overlay for text contrast, matching CauseKind theme */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1C1410]/95 via-[#1C1410]/50 to-transparent" />

            {/* Card Content */}
            <div className="absolute bottom-0 left-0 p-6 text-white w-full">
              <p className="text-sm font-semibold uppercase tracking-widest text-amber-300/90">
                {item.subtitle}
              </p>
              <h3 className="mt-1 text-2xl font-bold line-clamp-2 text-white">{item.title}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HoverRevealCards;
