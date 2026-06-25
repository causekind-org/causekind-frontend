export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content?: string;
  category: string;
  image: string;
  author: string;
  authorImage: string;
  publishedDate: string;
  readTime: string;
  peopleActed?: number;
  icon?: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "5-things-you-can-donate-right-now",
    title: "5 Things You Can Donate Right Now That Someone Near You Actually Needs",
    description: "Look around your home. That old school bag, those outgrown clothes, or the unused laptop could be exactly what a child nearby desperately needs. Discover the 5 most requested items and how to donate them locally through CauseKind.",
    category: "Community Action",
    image: "/Students.png",
    author: "CauseKind",
    authorImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuABI5YAyEovE5yILtURhCjGmz70ZuJqw9kfN-8nHKa8zURaO7lpuqGNObVYVt3RgTrWsJ-m5xXjj-smC7fnViISgB6_JDgE9nLFaES7yojtrsEJQMVdx1pIMbj8dKgQhwicZZTgLAG7Pigs6qwUyecmaxz-zqzhspdTu6rlOuwDWBNIPBp5DFK_sF_jQfpzqtMCMP8cZFsIyWjWySFeFUXllOu5UjIq-PwOS4LvFzmJ_DZYEnaJm406FB15rr9csPOr_RUN16gBOcTI",
    publishedDate: "June 2026",
    readTime: "5 min read",
    content: `
      <p class="text-xl">Look around your home for a moment. That shelf of books your child hasn't touched in two years. The school bag hanging on a hook with nowhere to go. The pile of clothes that no longer fits anyone in your family. The old laptop sitting in a drawer, half-forgotten.</p>
      
      <p>To you, these things are background. Part of the furniture. Things you keep telling yourself you'll "do something about."</p>
      
      <p>But here's the truth - and it might stop you for a second: Right now, within a few kilometres of where you're sitting, there is a child who doesn't have a school bag to carry to class tomorrow. There is a mother who is quietly worrying about how she'll manage new school uniforms this term. There is a student who wants to study online but has no device to do it on.</p>
      
      <p>The gap between what you have and what they need is not money. It's not effort. It's just awareness.</p>
      
      <p>That's what this blog is about. Here are 5 things sitting in your home right now that someone near you genuinely, urgently needs - and how you can get them there today, through CauseKind's In-Kind platform.</p>

      <h2 class="mt-8 mb-4">1. Books and School Notebooks</h2>
      <h3 class="mb-2">Why they matter more than you think</h3>
      <p>Education is the one thing a child can carry through life forever. But for many families in India, buying new textbooks and notebooks at the start of every school year is a real financial strain - not a small inconvenience, a genuine stress.</p>
      <p>When a parent has to choose between buying books and buying groceries, something has to give. Sometimes it's the books. And when a child shows up to school without proper materials, the gap between them and their classmates quietly begins to grow.</p>
      <p>Your old textbooks - even if they're a year or two old - can fill that gap completely.</p>
      
      <h4 class="mt-4 mb-2">What to look for at home:</h4>
      <ul class="list-disc pl-6 mb-4">
        <li>Old school textbooks (CBSE, ICSE, State Board)</li>
        <li>Notebooks with unused pages</li>
        <li>Story books, encyclopedias, dictionaries</li>
        <li>Drawing books and activity sets</li>
      </ul>
      <p>Even a partially used notebook has value. Even a textbook with highlighted passages is still a textbook.</p>
      
      <blockquote class="my-6">
        "It was my son's old Class 6 science textbook. I almost threw it away. Instead, it's now being used by a girl in the next neighbourhood who just started Class 6. I didn't expect that to make me emotional. It did." - A CauseKind donor from Mumbai
      </blockquote>

      <h2 class="mt-8 mb-4">2. School Bags and Stationery</h2>
      <h3 class="mb-2">The thing every child needs before day one</h3>
      <p>A school bag is one of the first things a child needs when a new academic year begins. It sounds simple. But for families living on tight budgets, buying a new bag - along with fees, uniforms, and books - can feel impossible.</p>
      <p>Children who go to school with torn bags or no bag at all carry more than their books. They carry the awareness that they are different from their classmates. That quiet feeling stays.</p>
      <p>Your child's old school bag, the one that's still perfectly usable but was swapped out for a newer one, is not just an object. It is a child's dignity on the first day of school.</p>
      
      <h4 class="mt-4 mb-2">What to look for at home:</h4>
      <ul class="list-disc pl-6 mb-4">
        <li>School bags in good condition</li>
        <li>Pencil cases, geometry boxes</li>
        <li>Pens, pencils, erasers, sharpeners</li>
        <li>Crayons and colour pencils</li>
        <li>Rulers, scales, and calculators</li>
      </ul>

      <h2 class="mt-8 mb-4">3. Clothes and School Uniforms</h2>
      <h3 class="mb-2">Because dignity should not depend on income</h3>
      <p>Clothes are one of the most sensitive donations - and one of the most needed.</p>
      <p>In India, a large number of children attend schools that require uniforms. A white shirt, a specific colour of trousers or skirt, a particular style of shoes. For families who can barely manage rent, buying an entirely new uniform set every year - especially as children grow quickly - is genuinely hard.</p>
      <p>And it's not just uniforms. Everyday clothes matter too. A warm sweater in winter. A clean set of play clothes. Basics that allow a child to simply be a child without their family carrying the weight of worry.</p>
      
      <h4 class="mt-4 mb-2">What to look for at home:</h4>
      <ul class="list-disc pl-6 mb-4">
        <li>School uniforms your child has outgrown (in good condition)</li>
        <li>Everyday kids' clothing - shirts, trousers, frocks, sweaters</li>
        <li>Adult clothes in good condition for families in need</li>
        <li>School shoes and sandals</li>
      </ul>

      <h2 class="mt-8 mb-4">4. Laptops, Tablets, and Old Smartphones</h2>
      <h3 class="mb-2">The device you forgot about could change a student's future</h3>
      <p>The pandemic changed something permanently about education in India. Online classes, digital learning platforms, government e-learning portals - all of it requires one thing: a device.</p>
      <p>Many students today are being left behind not because they lack ability or ambition, but because they simply don't have a phone or laptop to access their coursework on. They borrow. They wait. They miss classes. They fall behind.</p>
      <p>Meanwhile, millions of old smartphones and laptops sit unused in Indian homes. Functional devices - maybe a little slow, maybe with a cracked corner - that have been replaced by newer models and are now collecting dust.</p>
      
      <h4 class="mt-4 mb-2">What to look for at home:</h4>
      <ul class="list-disc pl-6 mb-4">
        <li>Old laptops or desktops that still work</li>
        <li>Tablets you no longer use</li>
        <li>Smartphones (even older models)</li>
        <li>Chargers, earphones, data cables</li>
      </ul>

      <h2 class="mt-8 mb-4">5. Toys, Games, and Learning Materials for Young Children</h2>
      <h3 class="mb-2">Because childhood is not a luxury</h3>
      <p>This one surprises people the most.</p>
      <p>When we think of donations, we think of essentials - food, clothes, medicine. Toys feel like extras. But child development experts are clear: play is how young children learn. It is how they develop language, problem-solving, creativity, and emotional intelligence.</p>
      <p>Children who grow up without access to books, toys, puzzles, and learning materials enter school already behind. The gap between a child who had a shelf of books and a child who had none shows up in literacy and numeracy scores for years.</p>
      <p>Your child's outgrown toys are not extras. For another child, they are tools.</p>
      
      <h4 class="mt-4 mb-2">What to look for at home:</h4>
      <ul class="list-disc pl-6 mb-4">
        <li>Board games and puzzle sets</li>
        <li>Building blocks and construction toys</li>
        <li>Picture books and story books for young readers</li>
        <li>Educational activity kits</li>
        <li>Dolls, soft toys, and play sets in good condition</li>
      </ul>

      <h2 class="mt-8 mb-4">How to Donate These Items on CauseKind - In 3 Simple Steps</h2>
      <p>CauseKind's In-Kind platform is built to make this as easy as possible. Here's all it takes:</p>
      <ol class="list-decimal pl-6 mb-4">
        <li><strong>Step 1: Browse In-Kind Requests</strong> Go to causekind.com/requests and see what families near you are actually asking for - right now, today.</li>
        <li><strong>Step 2: List Your Items or Match a Request</strong> Create your free account, list the items you want to donate, or directly match a specific request. Everything is admin-verified, so you know the need is real.</li>
        <li><strong>Step 3: Local Handoff - No Shipping Needed</strong> Every match is made within a 10 km radius. You arrange a simple local drop-off - no courier, no shipping cost, no complicated logistics.</li>
      </ol>
      <p>Zero platform fees. 100% of what you give reaches the person who needs it. Always.</p>
    `
  },
  {
    slug: "from-clutter-to-impact",
    title: "From Clutter to Impact: Turning Unused Household Items Into Community Change",
    description: "The items you no longer use aren't just clutter—they could be a lifeline for someone in your local community. Discover how an old school bag, a forgotten smartphone, or outgrown clothes can create real, verified impact right in your neighborhood.",
    category: "Community Action",
    image: "/Impact.png",
    author: "CauseKind",
    authorImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuABI5YAyEovE5yILtURhCjGmz70ZuJqw9kfN-8nHKa8zURaO7lpuqGNObVYVt3RgTrWsJ-m5xXjj-smC7fnViISgB6_JDgE9nLFaES7yojtrsEJQMVdx1pIMbj8dKgQhwicZZTgLAG7Pigs6qwUyecmaxz-zqzhspdTu6rlOuwDWBNIPBp5DFK_sF_jQfpzqtMCMP8cZFsIyWjWySFeFUXllOu5UjIq-PwOS4LvFzmJ_DZYEnaJm406FB15rr9csPOr_RUN16gBOcTI",
    publishedDate: "June 2026",
    readTime: "6 min read",
    content: `
      <p class="text-xl">There is a corner in almost every Indian home. You know the one. The shelf that's become a graveyard for things you meant to sort through. The cupboard that hasn't been fully opened in months. The box in the store room that's moved three times across three homes and has never actually been unpacked.</p>
      
      <p>Inside that corner, there are things that still work. Things that still have life in them. Things that - if you're honest - you are never going to use again.</p>
      
      <p>And somewhere in your city, a few kilometres away, there is a family that needs exactly one of those things today. Not someday. Today.</p>
      
      <p>This is not a blog about minimalism or decluttering. It's not about organising your home or living with less. It's about something much simpler and much more powerful: The stuff you've stopped seeing has the power to change someone's life - if it can just find its way to the right person.</p>

      <h2 class="mt-8 mb-4">The Clutter Problem Nobody Talks About</h2>
      <p>India is a country of extraordinary resourcefulness. We fix things instead of replacing them. We pass things down. We find second and third lives for objects that other cultures would discard without a thought.</p>
      <p>And yet - we also accumulate. Quietly, steadily, without realising it.</p>
      <p>The children grow up and leave behind a trail of school bags, uniforms, textbooks, and toys. The phone gets upgraded and the old one goes into a drawer. The laptop slows down and gets replaced, but the old one still works fine. The clothes no longer fit, but they're too good to throw away, so they sit folded in a bag that never quite makes it anywhere.</p>
      <p>According to estimates, millions of tonnes of perfectly usable goods sit idle in Indian homes every year - while an equal number of families in the same cities go without those very things.</p>
      <p>This is not a failure of generosity. Indians are among the most generous people in the world. It's a failure of connection. The people who have are not connected to the people who need. The items that are available are not matched with the requests that exist.</p>
      <p>CauseKind's In-Kind platform is built to fix exactly that.</p>

      <h2 class="mt-8 mb-4">What "Household Clutter" Actually Looks Like as Community Impact</h2>
      <p>Let's make this real. Let's walk through your home together.</p>

      <h3 class="mt-6 mb-2">The Study Room or Children's Bedroom</h3>
      <p>That stack of textbooks from two years ago. The set of storybooks your child devoured at age seven and hasn't touched since. The geometry box, the colour pencils, the half-used notebooks.</p>
      <p><strong>What you see:</strong> Old stuff taking up shelf space.</p>
      <p><strong>What a child nearby sees:</strong> The books they need for the school year they're about to start. The notebook they couldn't afford. The colour pencils they've never had.</p>
      <p>One family's "done with this" is another child's entire academic toolkit.</p>

      <h3 class="mt-6 mb-2">The Wardrobe</h3>
      <p>The school uniforms your child outgrew in the middle of the year. The sweater that's still perfectly warm but no longer fits. The shoes that were barely worn before the feet they belonged to grew two sizes.</p>
      <p><strong>What you see:</strong> Things that don't fit anymore.</p>
      <p><strong>What another child's parent sees:</strong> The uniform they've been trying to figure out how to afford. The warm layer their child needs this winter. The shoes that will let their child walk into school feeling like they belong.</p>
      <p>Clothes carry emotion. When a child wears something that fits, that's clean, that looks good - they stand a little taller. That matters.</p>

      <h3 class="mt-6 mb-2">The Store Room or That Drawer</h3>
      <p>The old smartphone, replaced by a newer model six months ago. The laptop that's "a bit slow" but absolutely still functional. The tablet you upgraded from. The chargers and earphones in a tangled pile.</p>
      <p><strong>What you see:</strong> Old tech, outdated, not worth much.</p>
      <p><strong>What a student nearby sees:</strong> The device that would let them attend online classes. The laptop they need to submit assignments. The phone that connects them to their school's learning portal.</p>
      <p>In today's India, not having a device is not an inconvenience - it is an educational emergency. One of your old phones could be the difference between a student keeping up and falling behind.</p>

      <h3 class="mt-6 mb-2">The Toy Shelf or the Box Under the Bed</h3>
      <p>The board games with all the pieces still intact. The building blocks your youngest has completely lost interest in. The picture books, the puzzles, the soft toys in good condition.</p>
      <p><strong>What you see:</strong> Things your kids have outgrown.</p>
      <p><strong>What a younger child in your neighbourhood sees:</strong> Wonder. Play. Learning. Joy.</p>
      <p>Young children learn through play. Every puzzle solved, every block stacked, every story heard is a building block of language, reasoning, and creativity. These are not luxuries. They are tools - and right now, they are sitting under your bed.</p>

      <h2 class="mt-8 mb-4">Why "I'll Donate Someday" Becomes Never</h2>
      <p>Here is something most of us know about ourselves: the intention to donate is almost always there. The follow-through is where it breaks down.</p>
      <p>Why?</p>
      <ul class="list-disc pl-6 mb-4">
        <li>Because the process feels complicated. You think about finding the right NGO, figuring out drop-off points, worrying about whether items will actually reach someone or end up in a warehouse.</li>
        <li>Because you're not sure your items are good enough. You wonder if that slightly worn bag or the textbook with highlighted passages is even worth donating.</li>
        <li>Because there's no obvious next step. The goodwill is there. The moment passes. The bag stays in the corner.</li>
      </ul>
      <p>CauseKind was built to remove every single one of these friction points.</p>
      <p>You can see exactly who needs what - right now, in your area. Real people. Real requests. Admin-verified before they go live. No vague "drop it in a box" moment - a specific match, a real family, a clear handoff.</p>
      <p>Your items don't need to be perfect. They need to be usable. A bag that's slightly scuffed is still a bag. A textbook with notes in the margins is still a textbook. A phone that's two generations old still makes calls and runs apps.</p>
      <p>The next step is always obvious. Browse requests. Match one. List your item. Arrange a 10 km local drop-off. Done. Your clutter has become someone's essential.</p>

      <h2 class="mt-8 mb-4">The 10 km Truth: Your Community Needs You Specifically</h2>
      <p>There is something important about the way CauseKind matches in-kind donations.</p>
      <p><strong>Every match is made within 10 kilometres of your home.</strong></p>
      <p>This is not just a logistical convenience - though it is that too, because it means no shipping, no couriers, no cost. It's a statement about what community actually means.</p>
      <p>The family who needs your child's old school bag is not an abstract face in a charity brochure. They are in your neighbourhood. They shop at some of the same markets you shop at. Their child may go to a school not far from yours. They are your community in the most literal sense of the word.</p>
      <p>When you donate locally, you're not just giving an item. You are investing in the place where you live. You are making your own neighbourhood stronger, more connected, more human.</p>
      <p>That is not a small thing. That is what community change actually looks like - not grand gestures, but a thousand small acts of giving between neighbours who finally found a way to find each other.</p>

      <h2 class="mt-8 mb-4">The Moment It Stops Being Clutter</h2>
      <p>There is a specific moment that CauseKind donors describe, and it's remarkably consistent.</p>
      <p>It's the moment they match their donation to a specific request. When they see a post from a parent in their area asking for a Class 7 science textbook - and they have exactly that on their shelf. When they list a school bag and within a day, someone nearby has accepted the offer.</p>
      <p>In that moment, the object transforms.</p>
      <p>It stops being the bag in the corner. It becomes the bag a child will carry to school on Monday morning.</p>
      <p>It stops being the old laptop taking up space. It becomes the device a student will use to submit her assignment on time.</p>
      <p>It stops being clutter. It becomes impact.</p>
      <p>And the thing is - you didn't have to spend anything extra. You didn't have to find extra money or extra time. You just had to look at what you already had with new eyes.</p>

      <h2 class="mt-8 mb-4">How to Turn Your Clutter Into Community Change Today</h2>
      <p>It takes less than ten minutes to get started.</p>
      <ol class="list-decimal pl-6 mb-4">
        <li><strong>Step 1 - Do a quick walkthrough of your home:</strong> Spend five minutes looking at your study, wardrobe, store room, and that one drawer. You are looking for: books, bags, clothes, uniforms, shoes, old devices, toys, games, stationery.</li>
        <li><strong>Step 2 - Browse what people near you actually need:</strong> Go to causekind.com/requests - these are real, admin-verified in-kind requests from families within your area. See if anything you found matches what someone is asking for.</li>
        <li><strong>Step 3 - Create your free CauseKind account:</strong> It's instant. No fees. No complicated process.</li>
        <li><strong>Step 4 - List your item or match an existing request:</strong> Post what you have, or directly respond to a specific request. Everything is verified, so you know it's going somewhere real.</li>
        <li><strong>Step 5 - Arrange your local drop-off:</strong> Within 10 km. No courier. No cost. A simple, human handoff.</li>
        <li><strong>Step 6 - Receive your Impact Certificate:</strong> After your item is delivered, CauseKind sends you a verified certificate - proof that your giving made it all the way to the person who needed it.</li>
      </ol>

      <h2 class="mt-8 mb-4">One Last Thought</h2>
      <p>We spend so much time thinking that making a difference requires something extraordinary - a large sum of money, a dramatic act, a life-changing decision.</p>
      <p>But most of the world's quiet good is done by ordinary people looking around and asking a simple question: <em>What do I have that someone else needs?</em></p>
      <p>You have that thing. It's in the corner. It's on the shelf. It's in the drawer you meant to sort through. The community around you is asking for it.</p>
      <p>Today is a good day to finally do something about that corner.</p>
    `
  },
  {
    slug: "decoding-section-80g",
    title: "Decoding Section 80G: How to Save Tax While Supporting a Cause",
    description: "If you've heard of Section 80G but never quite understood what it means for you as a salaried professional, this blog is written for you. No jargon. Just a clear explanation of how charitable giving and smart tax planning work together.",
    category: "Giving Smarter",
    image: "/80G.avif",
    author: "CauseKind",
    authorImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuABI5YAyEovE5yILtURhCjGmz70ZuJqw9kfN-8nHKa8zURaO7lpuqGNObVYVt3RgTrWsJ-m5xXjj-smC7fnViISgB6_JDgE9nLFaES7yojtrsEJQMVdx1pIMbj8dKgQhwicZZTgLAG7Pigs6qwUyecmaxz-zqzhspdTu6rlOuwDWBNIPBp5DFK_sF_jQfpzqtMCMP8cZFsIyWjWySFeFUXllOu5UjIq-PwOS4LvFzmJ_DZYEnaJm406FB15rr9csPOr_RUN16gBOcTI",
    publishedDate: "June 2026",
    readTime: "7 min read",
    content: `
      <p class="text-xl">It's that time of year again. Your HR sends the investment declaration reminder. Your CA asks for proof of savings. You start digging through folders for insurance receipts, home loan certificates, and PPF statements - and somewhere in the middle of all of it, you remember that you donated to a cause earlier this year.</p>
      
      <p>You made the transfer. You felt good about it. And then life moved on.</p>
      
      <p>But here's the part most people miss entirely: that donation you made - to the right organisation - could significantly reduce your taxable income this year. Not someday. This financial year. Right now, when it actually matters.</p>
      
      <h2 class="mt-8 mb-4">What Is Section 80G, in Plain English?</h2>
      <p>Section 80G is a provision in the Indian Income Tax Act that allows you to claim a deduction on your taxable income for donations made to eligible charitable organisations.</p>
      <p>In simpler terms: when you donate to a registered, eligible organisation, the government lets you subtract a portion of that donation from your taxable income - which means you pay less tax.</p>
      
      <h2 class="mt-8 mb-4">The Two Types of 80G Deductions: 50% vs 100%</h2>
      <p>Under Section 80G, donations are divided into two broad categories based on how much of your donation you can deduct from your taxable income:</p>
      
      <h3 class="mt-6 mb-2">🟢 100% Deduction</h3>
      <p>If an organisation is approved for 100% deduction, you can subtract the entire donation amount from your taxable income.</p>
      
      <h3 class="mt-6 mb-2">🟡 50% Deduction</h3>
      <p>If an organisation is approved for 50% deduction, you can subtract only half the donated amount from your taxable income. Most registered NGOs, charitable trusts, and giving platforms - including CauseKind - fall in this category.</p>
      
      <h2 class="mt-8 mb-4">What You Actually Need to Claim This Deduction</h2>
      <ul class="list-disc pl-6 mb-4">
        <li><strong>A Valid 80G Certificate:</strong> Confirm the organisation's registration is active.</li>
        <li><strong>An Official Receipt:</strong> Must include details like PAN and registration number.</li>
        <li><strong>Traceable Payment:</strong> Cash above ₹2,000 is not eligible. Use UPI, card, or transfer.</li>
        <li><strong>Form 10BE:</strong> Required from FY 2021-22 onwards.</li>
      </ul>
      
      <h2 class="mt-8 mb-4">The Bigger Picture</h2>
      <p>The government created Section 80G to encourage more Indians to support social causes. The best version of charitable giving is when you find a cause that genuinely matters to you, give to it thoughtfully and consistently, and then claim the legitimate tax benefit you are entitled to.</p>
    `
  },
  {
    slug: "the-ripple-effect-of-opportunity",
    title: "The Ripple Effect of Opportunity",
    description: "The blazer was slightly too stiff. Nandini had ironed it the night before, pressing each crease with the careful concentration of someone who had never owned a blazer before... Read how a single sponsorship creates a generational ripple effect.",
    category: "Stories of Impact",
    image: "/Ripple Effect of Opportunity.png",
    author: "CauseKind",
    authorImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuABI5YAyEovE5yILtURhCjGmz70ZuJqw9kfN-8nHKa8zURaO7lpuqGNObVYVt3RgTrWsJ-m5xXjj-smC7fnViISgB6_JDgE9nLFaES7yojtrsEJQMVdx1pIMbj8dKgQhwicZZTgLAG7Pigs6qwUyecmaxz-zqzhspdTu6rlOuwDWBNIPBp5DFK_sF_jQfpzqtMCMP8cZFsIyWjWySFeFUXllOu5UjIq-PwOS4LvFzmJ_DZYEnaJm406FB15rr9csPOr_RUN16gBOcTI",
    publishedDate: "June 2026",
    readTime: "8 min read",
    content: `
      <p class="text-xl">The blazer was slightly too stiff.</p>
      
      <p>Nandini had ironed it the night before, pressing each crease with the careful concentration of someone who had never owned a blazer before and was not entirely sure she was doing it right. She had watched a YouTube video. She had pressed it again in the morning just to be sure.</p>
      
      <p>Now she stood at the glass door of a fourteen-storey office building in Bandra Kurla Complex, the city of Mumbai moving fast and loud behind her, and she looked at her reflection in the door before she pushed it open. She barely recognised herself. Not because she looked different. But because she looked like she belonged here.</p>
      
      <h2 class="mt-8 mb-4">A Life of Dignity and Discipline</h2>
      <p>Her father had been selling chaat outside Dadar station for twenty-two years. He had built a life with those hands. A single room in Dharavi, school fees paid term by term, never ahead and never too far behind - but a life with dignity in it, held together by the discipline of a man who showed up every single day without fail.</p>
      
      <p>Nandini had grown up doing homework on the same table where her mother rolled out dough, memorising history dates to the soundtrack of the street. She had always been sharp. She scored 91% in her Class 12 boards - commerce stream, because science coaching was more expensive and she had not asked her father to find the money for it.</p>
      
      <h2 class="mt-8 mb-4">The Question: What Happens Now?</h2>
      <p>A Bachelor of Commerce from a good Mumbai college cost money Ramesh did not have. Not just tuition - the books, the transport, the laptop that every employer would eventually ask if she had, the three years of lost income while she studied instead of worked.</p>
      
      <h2 class="mt-8 mb-4">The Quiet Decision That Changed Everything</h2>
      <p>Mr. Arvind Menon had been buying chaat from Ramesh Kumar for eleven years. He knew Ramesh by name. He knew there was a daughter - bahut hoshiyaar hai, Ramesh always said. Very smart.</p>
      
      <p>One morning in March - Nandini's Class 12 results had just come out. Ninety-one percent. Commerce. Arvind Menon took his pani puri and walked to the station. He thought about it all day.</p>
      
      <p>That evening, he read about a verified educational trust that funded higher education for students from low-income households. He called the trust. He asked what a three-year B.Com sponsorship looked like. They told him. He said yes.</p>
      
      <h2 class="mt-8 mb-4">The Ripple Effect</h2>
      <p>Because here is what one sponsorship - one phone call, one man's quiet decision to say yes - actually set in motion:</p>
      <ul class="list-disc pl-6 mb-4">
        <li>The year Nandini joined her first job, her younger brother Akash stopped selling newspapers in the morning. His marks improved almost immediately.</li>
        <li>Two years later, Nandini paid for Akash's Class 11 and 12 science coaching. He wanted to be an engineer. She made sure that wanting was enough.</li>
        <li>Three years after that, she helped her parents move out of Dharavi into a small but proper one-bedroom flat in Ghatkopar.</li>
      </ul>
      
      <p>When Akash graduated and got a job, his first significant act with his salary was to donate to the same educational trust that had funded his sister. He wrote in the remarks field: For the next Nandini.</p>
      
      <h2 class="mt-8 mb-4">The Point of Anonymous Giving</h2>
      <p>Arvind Menon still buys chaat from Ramesh Kumar. He does not know about the flat in Ghatkopar, or the daughter in BKC, or Akash in engineering college. The trust never told him. That is policy.</p>
      <p>The whole point of giving through a verified system - anonymously, accountably, without expectation - is that the impact moves forward without you. The ripple does not need to know where it came from. It just keeps moving.</p>
    `
  },
  {
    slug: "safely-wipe-and-donate-smartphones-laptops",
    title: "Bridging the Digital Divide: How to Safely Wipe and Donate Your Old Smartphones and Laptops",
    description: "The device in your drawer is not clutter. It is someone's education. Let's get it there. Learn how to securely wipe and donate old devices.",
    category: "Giving Smarter",
    image: "/Laptop donation.png",
    author: "CauseKind",
    authorImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuABI5YAyEovE5yILtURhCjGmz70ZuJqw9kfN-8nHKa8zURaO7lpuqGNObVYVt3RgTrWsJ-m5xXjj-smC7fnViISgB6_JDgE9nLFaES7yojtrsEJQMVdx1pIMbj8dKgQhwicZZTgLAG7Pigs6qwUyecmaxz-zqzhspdTu6rlOuwDWBNIPBp5DFK_sF_jQfpzqtMCMP8cZFsIyWjWySFeFUXllOu5UjIq-PwOS4LvFzmJ_DZYEnaJm406FB15rr9csPOr_RUN16gBOcTI",
    publishedDate: "June 2026",
    readTime: "9 min read",
    content: `
      <p class="text-xl">Somewhere in your home right now, there is a drawer. You know the one. Inside it, there are devices - an old Android, the laptop you replaced last year, maybe a tablet.</p>
      
      <p>You have not thrown them away because they still work. You have not donated them because you worry about your data, or are not sure if they are good enough. By the time you finish reading, you will know exactly how to wipe your device safely and get it to a student in your city who needs it.</p>
      
      <h2 class="mt-8 mb-4">The Education Emergency</h2>
      <p>According to UNICEF India, an estimated 250 million children in India lack access to a digital device for learning. In a country where digital education has become the default, this is not a gap. It is a wall. The device you retired last year is not old. For a student who has never had one, it is the most advanced piece of technology they have ever been given.</p>
      
      <h2 class="mt-8 mb-4">How to Safely Wipe Your Smartphone Before Donating</h2>
      <ol class="list-decimal pl-6 mb-4">
        <li><strong>Back Up Everything:</strong> Save photos to Google Photos, contacts to Google Contacts, and chats to Google Drive.</li>
        <li><strong>Remove All Accounts and SIM:</strong> Remove your Google Account from settings. This is critical to prevent Factory Reset Protection (FRP) from locking the phone. Remove your SIM and SD cards.</li>
        <li><strong>Encrypt Your Device:</strong> Adds an extra layer of security so any surviving data fragments become unreadable.</li>
        <li><strong>Perform the Factory Reset:</strong> Go to Settings &gt; General Management &gt; Reset &gt; Factory Data Reset.</li>
      </ol>
      
      <h2 class="mt-8 mb-4">How to Safely Wipe Your Laptop Before Donating</h2>
      <h3 class="mt-6 mb-2">For Windows Laptops</h3>
      <p>Back up your files, sign out of your Microsoft Account and OneDrive, and perform a full reset (Settings &gt; System &gt; Recovery &gt; Reset this PC) making sure to select <strong>"Clean the drive"</strong>. This prevents data recovery.</p>
      
      <h3 class="mt-6 mb-2">For MacBooks</h3>
      <p>Back up with Time Machine, sign out of Apple ID completely (this signs out iCloud and iMessage), disable "Find My Mac", and then Erase and Reinstall macOS through Disk Utility in Recovery Mode.</p>
      
      <h2 class="mt-8 mb-4">What Condition Should a Device Be In?</h2>
      <p>Good to Donate: Powers on, screen is intact (minor scratches are okay), battery holds a charge for 3-4 hours, connects to Wi-Fi, and has a functional camera and microphone for online classes.</p>
      <p>Donate Only After Repair: Cracked screens that affect visibility, rapidly draining batteries, or a missing charger (buy a replacement first).</p>
      
      <h2 class="mt-8 mb-4">The Drawer Can Wait No Longer</h2>
      <p>There are 250 million students in India without a device. There are millions of functional phones and laptops in urban Indian drawers. The distance between those two facts is a factory reset and a ten-minute drive. Open the drawer today.</p>
    `
  }
];

export const insiderTips = [
  {
    title: "Efficiency Enhancements",
    description: "How to leverage automation features to eliminate manual tasks and save time.",
    icon: "settings",
    slug: "efficiency-enhancements"
  },
  {
    title: "Inventory Management",
    description: "How to utilize reporting and analytics features to make data-driven decisions about inventory.",
    icon: "inventory_2",
    slug: "inventory-management"
  },
  {
    title: "Payment Processing",
    description: "Best practices for ensuring secure and efficient payment processing with ImpactStory tools.",
    icon: "payments",
    slug: "payment-processing"
  },
  {
    title: "Technical Support",
    description: "Access 24/7 priority support and expert guidance for all your community management needs.",
    icon: "support_agent",
    slug: "technical-support"
  }
];
