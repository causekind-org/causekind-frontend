// TODO: replace with real Google reviews / API before launch.

export interface GoogleReview {
  id: string;
  name: string;
  rating: number;
  text: string;
  avatarUrl?: string;
  date: string;
}

export interface GoogleReviewsData {
  overallRating: number;
  totalReviews: number;
  reviews: GoogleReview[];
}

const mockReviews: GoogleReview[] = [
  {
    id: "1",
    name: "Priya Sharma",
    rating: 5,
    text: "CauseKind helped me find someone who truly needed my old laptop. The process was so transparent, and handing it over in person made it feel really special. Highly recommended!",
    date: "2 weeks ago",
  },
  {
    id: "2",
    name: "Rahul Verma",
    rating: 5,
    text: "A wonderful platform that removes the middlemen from giving. I love that I can see exactly who is receiving my items. The verification process makes it feel safe.",
    date: "1 month ago",
  },
  {
    id: "3",
    name: "Anjali Desai",
    rating: 4,
    text: "Great initiative. The website is easy to use and I was able to list my old clothes in just a few minutes. I got a match nearby very quickly.",
    date: "2 months ago",
  },
  {
    id: "4",
    name: "Vikram Singh",
    rating: 5,
    text: "This is exactly what our community needed. A way to directly help neighbours without worrying if the items actually reach the right people. Brilliant execution.",
    date: "3 months ago",
  },
  {
    id: "5",
    name: "Sneha Patel",
    rating: 5,
    text: "I was looking for textbooks for my son and found someone giving them away on CauseKind. The handover was smooth and the donor was so kind. Thank you!",
    date: "4 months ago",
  },
];

const reviewData: GoogleReviewsData = {
  overallRating: 4.9,
  totalReviews: 124,
  reviews: mockReviews,
};

export async function getReviews(): Promise<GoogleReviewsData> {
  // Simulating an API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(reviewData);
    }, 50);
  });
}
