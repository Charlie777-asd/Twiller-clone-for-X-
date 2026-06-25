import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import Notification from "./models/notification.js";
import { generateSeedData } from "./seedData.js";

// Complete dataset containing 20 unique tweets for each of the 20 bot accounts.
// Total collective output = 400 unique tweets with zero repetitions.
// Every single tweet includes a mandatory rich-media image asset URL.
const BOT_TWEETS_DATA = {
  desitech: [
    { content: "UPI transactions have crossed 15 billion this month! Absolute world-class fintech infrastructure.", image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800" },
    { content: "Indian AI startups are now training custom LLMs on regional languages. Huge step forward!", image: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800" },
    { content: "Semiconductor manufacturing in Gujarat is a game changer for local hardware startup ecosystems. #MakeInIndia", image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800" },
    { content: "ONDC is truly democratizing digital commerce for small vendors across India. #ONDC #DigitalIndia", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800" },
    { content: "The rise of edge computing is reducing latency for real-time applications dramatically. #EdgeComputing", image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800" },
    { content: "Exploring the potential of quantum computing in India. The future is closer than we think! #QuantumTech", image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800" },
    { content: "Why Rust is becoming the preferred language for systems programming. Memory safety matters. #RustLang", image: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=800" },
    { content: "Will WebAssembly eventually replace traditional containers? It's lighter and faster. #Wasm", image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800" },
    { content: "6G research is already under way in our leading technical institutes. What use cases are you most excited about?", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800" },
    { content: "A deep dive into zero-knowledge proofs and their role in modern cryptography. #Crypto #Security", image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800" },
    { content: "Smart contracts are revolutionizing supply chain transparency. Tracking goods from source to shelf.", image: "https://images.unsplash.com/photo-1508873535684-277a3cbcc4e8?w=800" },
    { content: "The importance of data privacy in the age of generative artificial intelligence. #DataPrivacy #AI", image: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800" },
    { content: "Open-source software is the backbone of the internet. Let's support the maintainers. #OpenSource", image: "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=800" },
    { content: "Serverless architecture: Focus on code, not infrastructure. Perfect for rapid prototyping.", image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800" },
    { content: "Developers, what is your favorite IDE setup? VS Code vs Neovim is the eternal battle. #Coding", image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800" },
    { content: "Kubernetes orchestration makes scaling microservices seamless, but it has a steep learning curve.", image: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800" },
    { content: "FIDO2 passwordless authentication is the future. Say goodbye to phishing attacks. #CyberSecurity", image: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800" },
    { content: "Is low-code development replacing developers? No, it's just freeing them for complex logic.", image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800" },
    { content: "The impact of 5G rollout on rural connectivity and digital education across India. #5G #Education", image: "https://images.unsplash.com/photo-1562408590-e32931084e23?w=800" },
    { content: "Neuromorphic hardware mimics the human brain structure for ultra-efficient AI processing. #Neuromorphic", image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800" }
  ],
  iplupdates: [
    { content: "IPL 2026 scheduling is announced! The opening match in Wankhede is going to be absolute fire.", image: "https://images.unsplash.com/photo-1531415080290-bc9b8a32a62a?w=800" },
    { content: "Unbelievable knock by the young opener tonight. Power hitting at its absolute best!", image: "https://images.unsplash.com/photo-1540747737956-3787240156c1?w=800" },
    { content: "Who is your pick for the Purple Cap this season? The bowling variations are incredible.", image: "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800" },
    { content: "Spinners dominating the middle overs once again. Masterclass in flight and turn.", image: "https://images.unsplash.com/photo-1608248597481-496100c8c836?w=800" },
    { content: "The atmosphere at the Eden Gardens is unmatched. Golden hour before the big match.", image: "https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=800" },
    { content: "Super Over drama! Nothing beats cricket under the lights on a Saturday night.", image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800" },
    { content: "A tribute to the groundsmen who work tirelessly to keep the outfield lightning fast.", image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800" },
    { content: "The rise of local talent from regional leagues in India to the IPL main stage is inspiring.", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800" },
    { content: "Catch of the tournament! Flying at deep midwicket, absolute sensational athleticism.", image: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=800" },
    { content: "Reviewing the auction strategies. Did your team get the balance right this time?", image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800" },
    { content: "A classic Yorker at 145 clicks. Middle stump out of the ground. Poetry in motion.", image: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800" },
    { content: "The evolution of the scoop shot. Batsmen are redefining 360-degree batting.", image: "https://images.unsplash.com/photo-1599586120429-902f6f219bfe?w=800" },
    { content: "Looking back at the historic test win at the Gabba. A defining moment for Indian cricket.", image: "https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=800" },
    { content: "Fitness standards in modern cricket are off the charts. Every run saved is a run scored.", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800" },
    { content: "Rain delay updates. The groundstaff are doing a phenomenal job covering the pitch.", image: "https://images.unsplash.com/photo-1534224039826-c7a0dea0e66a?w=800" },
    { content: "Comparing the great captains. Leadership style makes all the difference in tight games.", image: "https://images.unsplash.com/photo-1526676001051-199302179f82?w=800" },
    { content: "The joy of playing gully cricket with a tennis ball on a Sunday morning. Nostalgia!", image: "https://images.unsplash.com/photo-1516245834210-c4c142787335?w=800" },
    { content: "The impact of sports science on prolonging fast bowlers' careers. Fascinating study.", image: "https://images.unsplash.com/photo-1507398941214-572c25f4b1dc?w=800" },
    { content: "Under the floodlights in Bengaluru. The fans are chanting and the energy is contagious.", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800" },
    { content: "Women's Premier League is breaking records. The growth of women's sports in India is phenomenal.", image: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=800" }
  ],
  isrodaily: [
    { content: "ISRO's Gaganyaan capsule completes its abort testing successfully. India is heading to space!", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800" },
    { content: "A stunning high-resolution image of the lunar south pole captured by Chandrayaan-3 orbiter.", image: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800" },
    { content: "Aditya-L1 halo orbit insertion completed. The solar observatory is now fully operational.", image: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800" },
    { content: "Tracking the telemetry data of the upcoming SSLV launch. Small satellites are the future.", image: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800" },
    { content: "Celebrating the engineers at Sriharikota. Launching dreams into the cosmos.", image: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800" },
    { content: "The mechanics of cryogenic engines explained. Building India's heaviest launch vehicle.", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800" },
    { content: "ISRO partner firms developing indigenous space-grade components. Self-reliance in orbit.", image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800" },
    { content: "NavIC satellite constellation now providing precise timing and navigation data.", image: "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=800" },
    { content: "Astronaut trainees for the Gaganyaan mission completing zero-gravity simulation flight.", image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800" },
    { content: "The history of Rohini sounding rocket. How a humble start led to interplanetary missions.", image: "https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=800" },
    { content: "Designing smart payloads for deep space exploration. Destination: Venus.", image: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800" },
    { content: "Studying the atmosphere of Mars through data sent by the Mangalyaan mission.", image: "https://images.unsplash.com/photo-1614313913007-2b4ae8ce32d6?w=800" },
    { content: "Cleanroom views: Integrating the solar panels on the next generation communication satellite.", image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=800" },
    { content: "The role of satellite imagery in monitoring monsoon patterns and assisting Indian farmers.", image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800" },
    { content: "Collaborating with global space agencies for astrobiology research. Life beyond Earth.", image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800" },
    { content: "ISRO's reusable launch vehicle technology demonstrator completes autonomous landing.", image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800" },
    { content: "The beauty of a rocket plume breaking the sound barrier at dusk. Absolute science.", image: "https://images.unsplash.com/photo-1517976487492-5750f3195933?w=800" },
    { content: "Deep space network antennas tracking signals from 1.5 million kilometers away.", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800" },
    { content: "Teaching space science to rural school students. Inspiring the next generation of ISRO scientists.", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800" },
    { content: "Tracing the cosmic microwave background. Exploring the origins of our universe.", image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800" }
  ],
  indiapolitics: [
    { content: "Union Budget 2026 key highlights: Significant increase in digital infrastructure spending.", image: "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=800" },
    { content: "Parliament passes the new data protection bill. A major step towards digital privacy.", image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800" },
    { content: "Voter registration drive starts in colleges. Empowering the youth to participate in democracy.", image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800" },
    { content: "Reviewing the impact of the new education policy on rural schools. Infrastructure is key.", image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800" },
    { content: "New green energy corridor proposed to connect major solar power hubs across Rajasthan.", image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800" },
    { content: "Decentralized governance in action: Panchayat reforms showing real results in rural development.", image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800" },
    { content: "Analyzing the trends of state election manifestos. Focus shifts to employment and digitization.", image: "https://images.unsplash.com/photo-1507207611509-ec012433ff52?w=800" },
    { content: "The role of cooperative federalism in managing water resources across states.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" },
    { content: "How e-governance portals are reducing red tape for common citizens. A quiet revolution.", image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800" },
    { content: "Public debate on carbon tax policy. Balancing economic growth with climate goals.", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800" },
    { content: "New national highway projects to cut travel time between major economic hubs by 30%.", image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800" },
    { content: "Empowerment through digital literacy: Over 10 million rural women trained in online services.", image: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800" },
    { content: "The debate on central bank digital currency (CBDC). Financial sovereignty in the digital age.", image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800" },
    { content: "Smart cities mission: How IoT is improving waste management in selected municipal areas.", image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800" },
    { content: "Urban planning reforms needed to tackle rising challenges of monsoon waterlogging.", image: "https://images.unsplash.com/photo-1508962914676-134849a727f0?w=800" },
    { content: "Bilateral trade agreements signed in New Delhi focusing on renewable energy technology.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" },
    { content: "National healthcare scheme hits a milestone of 300 million registered beneficiaries.", image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800" },
    { content: "Public consultation launched for the upcoming national space legislation framework.", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800" },
    { content: "The transition to electric buses in state public transport fleets accelerating.", image: "https://images.unsplash.com/photo-1494832421162-538999141953?w=800" },
    { content: "A seminar on the role of youth in local self-government institutions held in Pune.", image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800" }
  ],
  bollygossip: [
    { content: "First look poster of the superstar's upcoming action drama is out! Looks absolutely epic.", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800" },
    { content: "Behind the scenes: The lead pair spotted rehearsing a massive dance number in Mumbai.", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800" },
    { content: "Rumor check: Is the famous director teaming up with the indie queen for a biopic? We hope so!", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800" },
    { content: "The album of the season has dropped! A.R. Rahman does it again. Masterpiece.", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800" },
    { content: "Cannes Film Festival updates: Red carpet fashion from Indian celebrities is making waves.", image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800" },
    { content: "Housefull boards are back! Incredible response to the new comedy thriller at single screens.", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800" },
    { content: "Box office updates: The action spectacle crosses 300 crores worldwide in its first week.", image: "https://images.unsplash.com/photo-1518085114588-1498b5010804?w=800" },
    { content: "OTTs are releasing experimental content. The latest psychological thriller is a must-watch.", image: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800" },
    { content: "Spotted: Celebrities at a popular Bandra restaurant keeping it casual for Sunday brunch.", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800" },
    { content: "An emotional tribute to the legendary lyricist who passed away. His songs will live forever.", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800" },
    { content: "The fashion trends from the latest rom-com are setting social media on fire.", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800" },
    { content: "A deep dive into the evolution of parallel cinema in India. Art that challenges.", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800" },
    { content: "The trailer of the highly anticipated sci-fi movie gets 50 million views in 24 hours.", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800" },
    { content: "Interview: The action star talks about doing his own stunts and recovering from injuries.", image: "https://images.unsplash.com/photo-1508962914676-134849a727f0?w=800" },
    { content: "National Film Awards announced. A well-deserved win for the lead actress of the indie drama.", image: "https://images.unsplash.com/photo-1518085114588-1498b5010804?w=800" },
    { content: "Throwback: The iconic shoot location in Ooty where classic 90s songs were filmed.", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800" },
    { content: "The rising popularity of South Indian cinema remake rights in Bollywood. Interesting trend.", image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800" },
    { content: "Celebrating 25 years of an iconic musical romance. The songs still hit just as hard.", image: "https://images.unsplash.com/photo-1487180142328-054b783fc471?w=800" },
    { content: "Young directors are reshaping the storytelling landscape with grit and reality. #Bollywood", image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800" },
    { content: "Star kids making their debut in the upcoming digital series. Expectations are sky-high.", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800" }
  ],
  desigamer: [
    { content: "Esports India gets official recognition. A massive milestone for the entire community! #Gaming", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800" },
    { content: "BGMI Championship grand finals start tomorrow. Which squad are you rooting for? #BGMI", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800" },
    { content: "Rate my new gaming desk setup! Finally managed to get the custom RGB lighting done.", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800" },
    { content: "Valorant Ranked match: Secured an Ace with Jett! Clutch moments are the best.", image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800" },
    { content: "The launch of the new RPG game is getting mixed reviews. What's your take on it?", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800" },
    { content: " Esport tournaments in India are pulling numbers that rival mainstream sports broadcast.", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800" },
    { content: "Deep dive: Why mechanical keyboards make a huge difference in competitive gaming.", image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800" },
    { content: "Testing the performance of the latest GPU under ray-tracing workload. Incredible frames.", image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800" },
    { content: "The rise of mobile gaming in tier-2 and tier-3 Indian cities. Access is everything.", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800" },
    { content: "Unboxing the next-gen console. The controller haptics are incredibly detailed.", image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800" },
    { content: "Coaching session: How to improve your aim and positioning in competitive shooters.", image: "https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800" },
    { content: "Retro gaming night: Playing classic 8-bit platformers. Some of these are harder than modern games!", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800" },
    { content: "The development of indigenous Indian video games. Mythological stories meet modern tech.", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800" },
    { content: "A review of the budget gaming laptops available in 2026. Perfect for students.", image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800" },
    { content: "Steam Deck performance in handheld mode is absolutely phenomenal. Best purchase of the year.", image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800" },
    { content: "Live stream setup complete. Going live in 10 minutes, come hang out and chat! #Gaming", image: "https://images.unsplash.com/photo-1618519764620-7403abdbfee9?w=800" },
    { content: "How cloud gaming could bypass the need for expensive hardware. The future of access.", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800" },
    { content: "Esports bootcamp in Hyderabad: The training schedule of professional gamers is intense.", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800" },
    { content: "Reviewing the best audio setups for spatial sound tracking in competitive shooters.", image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800" },
    { content: "The community tournaments on Discord are where real raw talents are discovered.", image: "https://images.unsplash.com/photo-1618519764620-7403abdbfee9?w=800" }
  ],
  musicindia: [
    { content: "Nothing beats a live Arijit Singh concert. The energy and emotion are unmatched. #Music", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800" },
    { content: "Punjabi pop continues to dominate global charts. Diljit Dosanjh sets a new standard.", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800" },
    { content: "Rehearsing classical Carnatic compositions on the keyboard. A beautiful blend.", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800" },
    { content: "Studio recording sessions: Mixing a new track with local independent artists.", image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800" },
    { content: "Traditional Rajasthani folk music performance at the desert festival. Pure soul.", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800" },
    { content: "Why independent music scene in India is growing faster than commercial playback.", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800" },
    { content: "A masterclass in sitar tuning. The science behind Indian classical music is deep.", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800" },
    { content: "The revival of vinyl records in major Indian cities. True audiophiles love the analog warmth.", image: "https://images.unsplash.com/photo-1487180142328-054b783fc471?w=800" },
    { content: "Behind the console: How music producers design the heavy basslines in Punjabi tracks.", image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800" },
    { content: "A tribute to the classical legends of Indian music. Their legacy is immortal.", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800" },
    { content: "Street musicians in Kolkata keeping the heritage of Baul songs alive. Heartwarming.", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800" },
    { content: "Reviewing the best wireless earbuds for high-fidelity audio playback. Soundstage matters.", image: "https://images.unsplash.com/photo-1484755560693-a4074577af3a?w=800" },
    { content: "Indian metal bands are gaining massive international recognition in European festivals.", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800" },
    { content: "Exploring the elements of Sufi rock fusion. Music that transcends borders.", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800" },
    { content: "How acoustic design affects vocal recording in home studio setups. Simple hacks.", image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800" },
    { content: "Classical flute recital by the river during sunrise. The most peaceful vibe.", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800" },
    { content: "The influence of Hip Hop in regional Indian languages: Voice of the streets.", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800" },
    { content: "A look at the vintage recording gear used in the golden age of Bollywood music.", image: "https://images.unsplash.com/photo-1487180142328-054b783fc471?w=800" },
    { content: "Indie artists share their journey on streaming platforms. Support independent music!", image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800" },
    { content: "Late night jamming sessions with the band. Hard work before the tour starts.", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800" }
  ],
  indianart: [
    { content: "Madhubani paintings displayed at the National Gallery. The detailing is remarkable.", image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800" },
    { content: "The beauty of Rajasthani miniature art: Stories of kings and lore on canvas.", image: "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=800" },
    { content: "Supporting rural clay artists and potters this festive season. Pure handmade craft.", image: "https://images.unsplash.com/photo-1565192647048-f997ded87958?w=800" },
    { content: "Exquisite carvings at Hampi. An architect's dream and a historian's paradise.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "A sketch of the spiritual ghats of Varanasi. Capturing the divine essence of the place.", image: "https://images.unsplash.com/photo-1561361060-619927161b9a?w=800" },
    { content: "Kalamkari art: Natural dyes and hand-painting on cotton fabrics. Truly sustainable.", image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800" },
    { content: "The timeless beauty of Indian bronze sculptures. Masterpieces of Chola metallurgy.", image: "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=800" },
    { content: "Traditional block printing process from Bagru, Rajasthan. Hand-stamped history.", image: "https://images.unsplash.com/photo-1565192647048-f997ded87958?w=800" },
    { content: "Exploring the abstract geometry in modern Indian paintings at the Mumbai gallery.", image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800" },
    { content: "Tanjore paintings: The rich gold leaf work and embedding of semi-precious stones.", image: "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=800" },
    { content: "The geometry and structure of stepwells (Baolis) in Gujarat. Masterpieces of utility.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "Warli art: Simple white paint on red mud walls, depicting daily tribal life and dance.", image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800" },
    { content: "A visit to the national museum: Tracing the evolution of Indian art over 5000 years.", image: "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=800" },
    { content: "Dhokra art: Non-ferrous metal casting using lost-wax casting technique. Tribal heritage.", image: "https://images.unsplash.com/photo-1565192647048-f997ded87958?w=800" },
    { content: "Pattachitra paintings from Odisha: Stories of mythology on pieces of treated cloth.", image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800" },
    { content: "The structural grandeur of Sun Temple, Konark. A marvel of medieval engineering.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "Gond art: Bright colors and intricate dotted patterns from the heart of Madhya Pradesh.", image: "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=800" },
    { content: "Exquisite bidriware work: Silver inlay on dark metal alloy from Bidar, Karnataka.", image: "https://images.unsplash.com/photo-1565192647048-f997ded87958?w=800" },
    { content: "Contemporary murals on urban walls in Delhi. Blending street art with local culture.", image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800" },
    { content: "Hand-painted wooden toys from Channapatna. Colorful, safe, and rich in history.", image: "https://images.unsplash.com/photo-1565192647048-f997ded87958?w=800" }
  ],
  travelindia: [
    { content: "Flying over the majestic Himalayas. There is no place like Kashmir in winters.", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800" },
    { content: "Andaman islands have some of the cleanest beaches and clearest waters in the world.", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800" },
    { content: "Sunrise over the Taj Mahal. A visual that stays in your heart forever.", image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800" },
    { content: "Trekking through the cold desert of Spiti Valley. Cruising on empty roads.", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800" },
    { content: "Alleppey backwaters: Floating houseboats and coconut trees in Kerala.", image: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800" },
    { content: "Exploring the blue streets of Jodhpur. Rajasthan's colors are absolutely vibrant.", image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800" },
    { content: "Witnessing the grand Ganga Aarti at Dashashwamedh Ghat in Varanasi. Spiritual vibes.", image: "https://images.unsplash.com/photo-1561361060-619927161b9a?w=800" },
    { content: "Chasing waterfalls in Meghalaya during the monsoon season. Greenery everywhere.", image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800" },
    { content: "The pristine tea gardens of Munnar. Perfect destination for a relaxing getaway.", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800" },
    { content: "A visit to the historic Amer Fort in Jaipur. Majestic architecture on the hill.", image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800" },
    { content: "Camping under the stars in the Rann of Kutch white desert. Magical night.", image: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800" },
    { content: "The ancient caves of Ajanta and Ellora. Incredible stone architecture from the past.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "Relaxing at a beach cafe in south Goa. Sunset views with wave sounds.", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800" },
    { content: "Crossing the Living Root Bridges in Cherrapunji. Nature's bio-engineering marvel.", image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800" },
    { content: "Exploring the ruins of Hampi on a rented bicycle. Historic temples everywhere.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "A winter trip to Gulmarg. Snowboarding on the slopes of Kashmir.", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800" },
    { content: "Safari ride in Jim Corbett National Park. Hoping to spot a tiger today.", image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800" },
    { content: "The unique architecture of Victoria Memorial in Kolkata. British era heritage.", image: "https://images.unsplash.com/photo-1558431382-27e303142255?w=800" },
    { content: "Visiting the Golden Temple in Amritsar. The peaceful atmosphere is unparalleled.", image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800" },
    { content: "Trekking to the Valley of Flowers in Uttarakhand. Nature in its peak bloom.", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800" }
  ],
  indianfoodie: [
    { content: "Street style butter paneer pizza in Mumbai. Outrageously rich and delicious!", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800" },
    { content: "Filter kaapi in Chennai. The only authentic way to start a perfect morning.", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800" },
    { content: "Authentic North Indian Thali with butter naan and rich daal makhani. Huge lunch!", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" },
    { content: "Hot samosas with mint and sweet tamarind chutneys. Best monsoon snack.", image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=800" },
    { content: "Assorted Indian sweets: Gulab jamun, kaju katli, and warm jalebi. Sugar rush!", image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800" },
    { content: "Hyderabadi chicken biryani: The aromatic rice and slow-cooked meat is legendary.", image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800" },
    { content: "Tasting street-style golgappas in Delhi. The spicy mint water is perfect.", image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=800" },
    { content: "A plate of hot Chole Bhature from a famous joint in old Delhi. Pure bliss.", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" },
    { content: "Crispy butter masala dosa served with hot sambar and coconut chutney.", image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800" },
    { content: "Baking fresh garlic naan in a traditional home clay oven setup.", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800" },
    { content: "Exploring the spicy street food of Indore. Sarafa Bazaar is a foodie paradise.", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800" },
    { content: "Simple home-cooked comfort food: Yellow Dal Tadka with hot steamed Jeera Rice.", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" },
    { content: "Indo-Chinese special: Spicy Schezwan Paneer with Veg Fried Rice. Heavy dinner.", image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800" },
    { content: "Freshly squeezed sugarcane juice on a hot summer afternoon. Instantly refreshing.", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800" },
    { content: "A cup of masala chai with ginger and cardamom by the roadside. True emotion.", image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800" },
    { content: "Baking a cardamon-infused sponge cake for the weekend tea party.", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800" },
    { content: "Goan fish curry with local rice. A beautiful blend of coconut and spices.", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" },
    { content: "Assorted kebabs hot off the charcoal grill in Lucknow. Incredibly tender.", image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800" },
    { content: "Sweet lassi served in a clay pot (kulhad) with a thick layer of malai on top.", image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800" },
    { content: "Trying the classic Gujarati snack: Dhokla with mustard seed tempering.", image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=800" }
  ],
  fitdesi: [
    { content: "Early morning Yoga session by the Ganges in Rishikesh. Inner peace achieved.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800" },
    { content: "Gym culture is booming. Push day session complete, consistency is everything.", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800" },
    { content: "Prepping for the half marathon. Managed a clean 10k run this morning.", image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800" },
    { content: "High-protein snack hack: Roasted chickpeas with spices. Crunchy and healthy.", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" },
    { content: "Surya Namaskar routine to activate the body. Keep moving every single day.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800" },
    { content: "Why progressive overload is the most important concept in weight training.", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800" },
    { content: "Simple meal prep: Grilled paneer with stir-fried broccoli and bell peppers.", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" },
    { content: "The benefits of strength training for women. Build strength and confidence.", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800" },
    { content: "Hydration check! Make sure you are drinking enough water throughout the workday.", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800" },
    { content: "Rest days are just as important as workout days. Give your muscles time to recover.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800" },
    { content: "Starting the day with a high-fiber oats and mixed seeds bowl. Energetic start.", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" },
    { content: "Why form matters more than the weight you lift. Protect your joints.", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800" },
    { content: "Tracking my steps. Hitting 10,000 steps daily is a simple way to stay active.", image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800" },
    { content: "The power of meditation: Just 10 minutes of deep breathing to clear stress.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800" },
    { content: "Healthy post-workout smoothie: Banana, peanut butter, and plant protein.", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" },
    { content: "How poor posture during desk jobs affects your spine. Stand up and stretch!", image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800" },
    { content: "A brisk evening walk in the local park. Clears the mind after a long day.", image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800" },
    { content: "Core workout session: Planks and leg raises. Consistency over intensity.", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800" },
    { content: "Replacing sugary drinks with fresh coconut water. Nature's own sports drink.", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800" },
    { content: "Setting realistic fitness goals for the next three months. Focus on habits.", image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800" }
  ],
  paisaletter: [
    { content: "BSE Sensex hits an all-time high! The markets show incredible resilience.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800" },
    { content: "Understanding the difference between direct and regular mutual fund plans. Save on expense ratio.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" },
    { content: "Designing a diversified portfolio: Asset allocation is the key to risk management.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800" },
    { content: "UPI records yet another milestone. Digital payments are completely replacing cash.", image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800" },
    { content: "Tax planning tips under the new regime. File your declarations early to avoid rush.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" },
    { content: "Why compounding is called the eighth wonder of the world. Start investing early.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800" },
    { content: "The growth of gold ETFs in India. A safe and liquid way to hold precious metal.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800" },
    { content: "Inflation vs Interest rates: How central bank policies affect your fixed deposits.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" },
    { content: "What is a Sovereign Gold Bond (SGB) and why it's a great option for long-term investors.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800" },
    { content: "Demystifying credit scores. Maintain a good score to get cheaper loans in the future.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" },
    { content: "Emergency fund setup: Keep at least 6 months of expenses in a liquid instrument.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800" },
    { content: "Why term insurance is the most basic and essential insurance product you need.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" },
    { content: "How direct equity investing differs from mutual fund investing. Know your risk appetite.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800" },
    { content: "Analysing the growth of Indian REITs. Real estate exposure without buying property.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" },
    { content: "The mechanics of Dollar Cost Averaging (SIP). Don't try to time the market.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800" },
    { content: "A beginner's guide to index funds. Low cost and highly diversified investing.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" },
    { content: "What are liquid funds and how they compare with savings accounts for parking cash.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800" },
    { content: "The impact of currency fluctuations on international mutual fund investments.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" },
    { content: "Understanding corporate bonds and high-yield debt. Balance yields with credit ratings.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800" },
    { content: "Reviewing my financial goals for the financial year. Keep tracking progress.", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800" }
  ],
  desistartup: [
    { content: "Pitch deck reviews with Bengaluru founders. The innovation in SaaS is incredible.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "Why India is the most competitive market for fintech startups globally. Scale is massive.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "Collaboration spaces in Indian tech hubs are buzzing with ideas. Best time to build.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "Female founders in India are leading some of the most capital-efficient companies.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "The startup ecosystem ranks third globally. Unicorn count continues to grow.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "Bootstrap vs VC funding: Choose the path that matches your long-term vision.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "Product-Market Fit (PMF) is the only metric that matters in the early stages.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "Why customer retention is cheaper and more valuable than customer acquisition.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "The role of mentorship in avoiding early-stage startup execution pitfalls.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "How D2C brands in India are leveraging local logistics to challenge retail giants.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "The challenges of hiring first 10 employees for your startup. Look for cultural alignment.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "Why deeptech startups need longer gestation periods and patient capital.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "The rise of micro-VCs in India: More options for pre-seed founders.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "How artificial intelligence is being integrated into customer service pipelines.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "Building in public: Why transparency attracts early adopters and investors.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "The pivot: When to change your startup direction based on data, not feelings.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "Exploring the growth of agritech startups streamlining supply chains for farmers.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "Why equity splits among co-founders must be settled early and legally.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "A review of the incubator programs supporting student startups in college campuses.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" },
    { content: "The goal is profitability: Why unit economics must make sense from day one.", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800" }
  ],
  bharathistory: [
    { content: "Exploring the Amer Fort in Jaipur. Majestic architecture on the hills.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "Rare manuscripts of the Chola dynasty on display at the museum. Pure heritage.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Qutub Minar: Centuries of history built in red sandstone. Iconic Delhi landmark.", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800" },
    { content: "The ruins of Nalanda University: The oldest center of knowledge in Asia.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "Ajanta & Ellora caves: Rock-cut sculptures dating back to 2nd century BCE.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "The iron pillar of Delhi: Rust-resistant metallurgy from 1600 years ago.", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800" },
    { content: "The maritime history of the Cholas. Navy that dominated the Indian Ocean.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "The engineering behind the Tanjore Big Temple: Granite blocks with no mortar.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "Understanding the trade routes of the Indus Valley Civilization with Mesopotamia.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "The legacy of Ashoka's rock edicts: Proclaiming peace and dharma across borders.", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800" },
    { content: "The grand design of Humayun's Tomb: The inspiration behind the Taj Mahal.", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800" },
    { content: "The historic battles of Panipat and how they changed the course of Indian history.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "The coins of the Gupta Empire: Re-living the golden age through gold coins.", image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800" },
    { content: "The architecture of Hampi: Tracing the heights of the Vijayanagara Empire.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "The role of the silk route in sharing Indian philosophy and science with the West.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "The history of the grand trunk road. Connecting the subcontinent for centuries.", image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800" },
    { content: "The rock shelters of Bhimbetka: Cave paintings from the Stone Age.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "The defense structures of the Mehrangarh Fort in Jodhpur. Incredibly secure.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" },
    { content: "The history of Indian astronomy: From Jantar Mantar to modern space science.", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800" },
    { content: "A look at the ancient water management systems of Dholavira. Ahead of its time.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" }
  ],
  desi_couture: [
    { content: "Classic Banarasi silk sarees are making a massive comeback this wedding season.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "Pairing pastel Kurtas with oxidized silver jewelry for a subtle festive look.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "Chikankari work from Lucknow: The elegance of white thread on pastel georgette.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "Indian Mojaris and Juttis to complete your traditional outfit setup.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "Modern Indo-western fusion wear is dominating college festivals this year.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "The rich textures of Kanjeevaram silk from the temple towns of South India.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "Bandhani tie-dye prints from Gujarat: Colorful patterns for casual outfits.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "The art of styling a designer dupatta with a simple monochrome suit.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "Exploring the revival of handloom fabrics in mainstream designer collections.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "The beauty of hand-embroidered Phulkari dupattas from Punjab.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "A look at the sustainable fashion brands promoting organic khadi wear.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "Men's ethnic fashion: The rise of asymmetric kurtas and bandhgala jackets.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "The detailed threadwork of Rajasthani Gota Patti borders. Shiny and festive.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "Bridal trends: Ivory lehengas are challenging the traditional red collections.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "How to drape a saree in different regional styles. Versatility at its best.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "The return of bell sleeves and vintage prints in contemporary ethnic wear.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "A visit to a handloom weaving cooperative in Bhagalpur. Raw silk details.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "Traditional block prints meet modern silhouettes in casual office wear.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "Accessorizing ethnic wear: Jhumkas and potli bags are the perfect additions.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" },
    { content: "Why hand-spun cotton is the perfect fabric for the hot Indian summer.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" }
  ],
  gyanpedia: [
    { content: "Did you know? The game of Snakes and Ladders originated in India as Moksha Patam. #Trivia", image: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800" },
    { content: "The concept of Zero was formally introduced by mathematician Aryabhata. #Gyan", image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800" },
    { content: "Sanskrit is considered the mother of many modern Indo-European languages.", image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800" },
    { content: "Takshashila, established in 700 BCE, is recognized as the world's first university.", image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800" },
    { content: "The suspension bridge in Ladakh is the highest altitude bridge globally. #Fact", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800" },
    { content: "Did you know that India has the largest postal network in the world? High efficiency.", image: "https://images.unsplash.com/photo-1539627831859-a911cf042acc?w=800" },
    { content: "The chess game originated in ancient India as Chaturanga in the 6th century.", image: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800" },
    { content: "Kumbh Mela is the largest gathering of humans on Earth, visible from space satellite.", image: "https://images.unsplash.com/photo-1561361060-619927161b9a?w=800" },
    { content: "The Indian national kabaddi team has won all the World Cups held so far.", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800" },
    { content: "Lonar Lake in Maharashtra was created by a meteor impact over 50,000 years ago.", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800" },
    { content: "The Golden Temple serves free meals to over 100,000 people daily, regardless of religion.", image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800" },
    { content: "Did you know that ayurveda is the oldest school of medicine known to mankind?", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
    { content: "The Chenab Bridge in Jammu & Kashmir is the tallest rail bridge in the world.", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800" },
    { content: "India is the largest producer of spices, contributing to over 70% of global supply.", image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800" },
    { content: "Sushruta is recognized as the father of surgery, detailing operations 2600 years ago.", image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800" },
    { content: "Magnetic Hill in Ladakh has magnetic properties that pull cars uphill against gravity.", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800" },
    { content: "The place value system and the decimal system were developed in India in 100 BCE.", image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800" },
    { content: "Wettest place on Earth is Mawsynram in Meghalaya, receiving 11,872mm of rain annually.", image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800" },
    { content: "Did you know that buttons were invented in the Indus Valley Civilization for decoration?", image: "https://images.unsplash.com/photo-1539627831859-a911cf042acc?w=800" },
    { content: "The world's first granite temple is the Brihadeeswarar Temple in Tanjore, Tamil Nadu.", image: "https://images.unsplash.com/photo-1600100397608-f010e97669d2?w=800" }
  ],
  click_desi: [
    { content: "Caught this Bengal Tiger in Ranthambore today. Truly a majestic sight.", image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800" },
    { content: "Testing a new wide-angle lens during golden hour at Marine Drive, Mumbai.", image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800" },
    { content: "Street photography in Chandni Chowk, Delhi. Capturing the raw daily hustle.", image: "https://images.unsplash.com/photo-1508962914676-134849a727f0?w=800" },
    { content: "Sunset over the Western Ghats. Nature's canvas is completely unmatched.", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800" },
    { content: "A peacock displaying feathers in the Haryana countryside. Perfect shot.", image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800" },
    { content: "Macro photography of dew drops on tea leaves in Munnar early morning.", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800" },
    { content: "The silhouettes of fishermen throwing nets in Cochin during sunset. Gold light.", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800" },
    { content: "Portrait of an old vendor in Jaipur. The wrinkles tell a thousand stories.", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800" },
    { content: "Long exposure shot of the Bandra-Worli Sea Link lights at night. Modern Mumbai.", image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800" },
    { content: "Migratory birds at Bharatpur Sanctuary. A heaven for wildlife photographers.", image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800" },
    { content: "The architecture of Lotus Temple against a clear blue winter sky in Delhi.", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800" },
    { content: "A group of kids playing football in the rains in Goa. Pure raw emotion.", image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800" },
    { content: "Snowy pine trees in Gulmarg. Trying out high contrast winter settings.", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800" },
    { content: "The stars over Pangong Lake, Ladakh. Astrophotography at 14,000 feet altitude.", image: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800" },
    { content: "A shot of the colorful spices in a local market in Jodhpur. Patterns and hues.", image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800" },
    { content: "Golden reflection of the Golden Temple in the sacred pool at dusk.", image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800" },
    { content: "A leopard resting on a branch in Jawai, Rajasthan. Spotting was intense.", image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800" },
    { content: "The mist rising from the hills of Ooty at sunrise. Soft pastels.", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800" },
    { content: "A train crossing the Pamban Bridge over the sea. Architectural symmetry.", image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800" },
    { content: "Street vendor roasting corn on charcoal during monsoon. Classic Indian vibe.", image: "https://images.unsplash.com/photo-1508962914676-134849a727f0?w=800" }
  ],
  desi_wellness: [
    { content: "Herbal remedies: Brewing Kadha with ginger, tulsi and pepper to boost immunity.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
    { content: "The benefits of daily mindfulness meditation on reducing stress hormones.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800" },
    { content: "Turmeric and raw honey: The ancient golden milk recipe for recovery.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
    { content: "Ayurvedic oil massage (Abhyanga) for improving blood circulation and skin health.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
    { content: "Drinking copper-charged water in the morning. An ancient daily health practice.", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800" },
    { content: "Why seasonal eating (Ritucharya) in ayurveda aligns your body with nature.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
    { content: "Using natural neem packs to soothe skin irritation and blemishes.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
    { content: "The power of pranayama: Alternate nostril breathing to balance nervous system.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800" },
    { content: "Replacing processed sugar with organic jaggery in your daily diet. Simple shift.", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" },
    { content: "Exploring the healing properties of Ashwagandha for stress relief and energy.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
    { content: "Triphala powder: The ultimate digestive cleanser recommended in ancient texts.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
    { content: "Why waking up during Brahma Muhurta (sunrise) boosts mental clarity and focus.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800" },
    { content: "A cup of herbal hibiscus tea. Packed with antioxidants and great for blood pressure.", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800" },
    { content: "Using sandalwood paste to naturally cool down skin during hot summers.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
    { content: "The role of gut health in overall immunity. Incorporate homemade curd (dahi) daily.", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" },
    { content: "Detoxifying your home: Using burning camphor and sage to clear negative energy.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800" },
    { content: "Why physical stretches (Asanas) must always precede deep meditation sessions.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800" },
    { content: "Exploring the benefits of consuming soaked almonds and walnuts in the morning.", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800" },
    { content: "Amla (Gooseberry): The richest source of Vitamin C to boost your hair and skin.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800" },
    { content: "Ending the day with a simple gratitude meditation. Health is a state of mind.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800" }
  ],
  cine_masala: [
    { content: "Tollywood's new epic is a visual masterpiece. Action sequences are 10/10!", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800" },
    { content: "South cinema continues to dominate the global box office. Records are shattered.", image: "https://images.unsplash.com/photo-1518085114588-1498b5010804?w=800" },
    { content: "Mollywood's new indie thriller gets a standing ovation at international festivals.", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800" },
    { content: "Celebrated director announces a sci-fi collab with Tamil superstar. Heavy hype!", image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800" },
    { content: "Reliving classic Indian parallel cinema: Masterpieces from Satyajit Ray and Ghatak.", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800" },
    { content: "Why regional cinema is writing better scripts than mainstream commercial movies.", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800" },
    { content: "The rising trend of pan-Indian movies. Breaking language barriers in cinema.", image: "https://images.unsplash.com/photo-1518085114588-1498b5010804?w=800" },
    { content: "A tribute to the character artists who elevate the entire film with their performance.", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800" },
    { content: "How cinematography has evolved in South cinema. Stunning lighting and angles.", image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800" },
    { content: "Review: The new Kannada action drama is an absolute treat for masala lovers.", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800" },
    { content: "The role of background music (BGM) in creating elevation scenes in mass movies.", image: "https://images.unsplash.com/photo-1518085114588-1498b5010804?w=800" },
    { content: "Exploring the roots of realism in Malayalam cinema. Simple stories, deep impact.", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800" },
    { content: "The grand pre-release event of the upcoming mythological fantasy film in Chennai.", image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800" },
    { content: "Interview: The action choreographer explains how they filmed the complex train sequence.", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800" },
    { content: "Why regional film festivals are essential for promoting independent filmmakers.", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800" },
    { content: "Throwback to the classic comedies of the 80s that still make us laugh out loud.", image: "https://images.unsplash.com/photo-1518085114588-1498b5010804?w=800" },
    { content: "The transition from physical sets to high-quality CGI in modern fantasy movies.", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800" },
    { content: "How screenwriters are bringing local folklore into mainstream commercial cinema.", image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800" },
    { content: "The rising demand for subtitle writers as Indian cinema goes global. Major job boom.", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800" },
    { content: "A look at the iconic movie theatres in South India that are historic landmarks.", image: "https://images.unsplash.com/photo-1518085114588-1498b5010804?w=800" }
  ],
  desi_reads: [
    { content: "Re-reading Rabindranath Tagore's Gitanjali. The depth of Indian poetry is infinite.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Weekend stack: Contemporary Indian fiction from Roy and Amitav Ghosh.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Discovering legendary Hindi poets like Harivansh Rai Bachchan. Beautiful lines.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Visualizing regional Indian mythology retellings. Outstanding worldbuilding.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Chanakya's Arthashastra: Timeless wisdom on statecraft, ethics and economics.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "The poetry of Sarojini Naidu: Capturing the simple beauty of Indian villages.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Reviewing the translation of classic regional novels into English. Preserving the context.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Why R.K. Narayan's Malgudi Days remains the most nostalgic read for generations.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Exploring the philosophical depth of the Upanishads. Ancient Indian wisdom.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Indian non-fiction picks focusing on economic history and geopolitical changes.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "The rise of young independent publishing houses promoting diverse regional voices.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Poetry sessions in Delhi cafes: Spoken word is giving a fresh voice to youth.", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800" },
    { content: "A biography of a legendary freedom fighter that details their early life in prison.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Analyzing the storytelling structure of ancient Indian epics. Masterclasses in plotting.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Why we need to read more regional literature translated into other Indian languages.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Weekend reading: A gripping historical fiction set in the Mughal era.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Exploring the theme of identity in diasporic Indian writing. Relatable and deep.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "The beauty of Urdu ghazals: Tracing the lyrics of Ghalib and Faiz.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "A book review of the latest award-winning collection of short stories from the Northeast.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" },
    { content: "Organizing my personal library bookshelf. Books are a man's best companions.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800" }
  ]
};

// Internal helper to process tweet interest-matching and mention notifications
const processTweetNotifications = async (tweet) => {
  try {
    const author = tweet.author;
    const content = tweet.content || "";
    const contentLower = content.toLowerCase();
    const notificationsToInsert = [];

    // Mention detection
    const mentions = [...content.matchAll(/@(\w+)/g)].map(match => match[1]);
    const uniqueMentions = [...new Set(mentions)];
    for (const username of uniqueMentions) {
      const mentionedUser = await User.findOne({ username: { $regex: new RegExp("^" + username + "$", "i") } });
      if (mentionedUser && mentionedUser._id.toString() !== author.toString()) {
        notificationsToInsert.push({
          recipient: mentionedUser._id,
          sender: author,
          type: "mention",
          tweet: tweet._id,
          content: "mentioned you in a post",
          extra: `"${content.slice(0, 80)}${content.length > 80 ? "…" : ""}"`
        });
      }
    }

    const KEYWORD_LIST = ["cricket", "science"];
    const allUsers = await User.find({
      $or: [
        { notificationsEnabled: true },
        { interests: { $exists: true, $ne: [] } }
      ]
    }).select("_id interests notificationsEnabled").lean();

    for (const u of allUsers) {
      const recipientId = u._id.toString();
      const authorId    = tweet.author.toString();
      const isSelf      = recipientId === authorId;
      const matchedTerms = [];

      if (u.interests && u.interests.length > 0) {
        const userInterests = u.interests.map(i => i.toLowerCase().replace(/^#/, ""));
        for (const interest of userInterests) {
          if (contentLower.includes(interest) || contentLower.includes(`#${interest}`)) {
            matchedTerms.push(interest);
          }
        }
      }

      if (matchedTerms.length === 0 && !isSelf && u.notificationsEnabled) {
        const matchedKws = KEYWORD_LIST.filter(k => contentLower.includes(k));
        if (matchedKws.length > 0) {
          matchedTerms.push(...matchedKws);
        }
      }

      if (matchedTerms.length === 0) continue;

      for (const term of matchedTerms) {
        const label = isSelf ? `you posted about #${term}` : `posted about #${term}`;
        notificationsToInsert.push({
          recipient: u._id,
          sender: tweet.author,
          type: "interest",
          tweet: tweet._id,
          content: label,
          extra: `"${tweet.content.slice(0, 80)}${tweet.content.length > 80 ? "…" : ""}"`
        });
      }
    }

    if (notificationsToInsert.length > 0) {
      await Notification.insertMany(notificationsToInsert);
    }
  } catch (err) {
    console.error("[Bot Simulator] Error processing notifications:", err);
  }
};

// Authoritative run-once seeding logic for bot tweets
export const seedBotTweets = async () => {
  try {
    const dbBots = await User.find({ isBot: true });
    if (!dbBots || dbBots.length === 0) {
      console.log("⚠️ [Bot Seeding] No bot accounts found in database. Seed bots first.");
      return;
    }

    const botIds = dbBots.map(b => b._id);
    
    // Check if bot tweets are already fully seeded (exactly 400 tweets, 20 per bot)
    const existingBotTweetsCount = await Tweet.countDocuments({ author: { $in: botIds } });
    if (existingBotTweetsCount === 400) {
      console.log("✅ [Bot Seeding] Bot tweets are already fully seeded (exactly 400 tweets). Skipping seeding.");
      return;
    }

    console.log(`⏳ [Bot Seeding] Seeding exactly 400 bot tweets. Clearing existing ${existingBotTweetsCount} bot tweets first...`);
    await Tweet.deleteMany({ author: { $in: botIds } });

    const tweetsToInsert = [];
    const totalTweetsPerBot = 20;

    // Base timestamp: starting 15 days ago
    let currentTime = Date.now() - 15 * 24 * 60 * 60 * 1000;
    
    // Stagger timestamp increment: 15 days split over 400 tweets (~54 minutes per tweet)
    const timeIncrement = Math.floor((15 * 24 * 60 * 60 * 1000) / 400);

    // Interleave the posts sequentially so no two consecutive tweets are written by the same bot account
    for (let col = 0; col < totalTweetsPerBot; col++) {
      for (let row = 0; row < dbBots.length; row++) {
        const bot = dbBots[row];
        const botSpecificTweets = BOT_TWEETS_DATA[bot.username];
        if (botSpecificTweets && botSpecificTweets[col]) {
          const tweetData = botSpecificTweets[col];
          tweetsToInsert.push({
            author: bot._id,
            content: tweetData.content,
            image: tweetData.image,
            timestamp: new Date(currentTime),
            notificationsSent: true
          });
          currentTime += timeIncrement;
        }
      }
    }

    await Tweet.insertMany(tweetsToInsert);
    console.log(`✅ [Bot Seeding] Successfully seeded exactly ${tweetsToInsert.length} unique, alternating bot tweets with images.`);
  } catch (err) {
    console.error("❌ [Bot Seeding] Seeding process failed:", err);
  }
};

// Background action generator (likes and retweets only, as posts are limited to exactly 20 per bot)
export const runBotAction = async () => {
  try {
    const bots = await User.find({ isBot: true });
    if (!bots || bots.length === 0) return;

    // Pick a random bot
    const bot = bots[Math.floor(Math.random() * bots.length)];
    
    // Random action: 0 = Like a tweet, 1 = Retweet a tweet
    const actionType = Math.floor(Math.random() * 2);

    const totalTweets = await Tweet.countDocuments();
    if (totalTweets === 0) return;

    const randomOffset = Math.floor(Math.random() * totalTweets);
    const tweet = await Tweet.findOne().skip(randomOffset);

    if (!tweet) return;

    if (actionType === 0) {
      // LIKE
      const hasLiked = tweet.likedBy.some(id => id.toString() === bot._id.toString());
      if (!hasLiked) {
        tweet.likes += 1;
        tweet.likedBy.push(bot._id);
        await tweet.save();

        const tweetAuthor = await User.findById(tweet.author);
        if (tweetAuthor && !tweetAuthor.isBot) {
          await new Notification({
            recipient: tweet.author,
            sender: bot._id,
            type: "like",
            tweet: tweet._id,
            content: "liked your post",
            extra: `"${tweet.content.slice(0, 60)}${tweet.content.length > 60 ? "…" : ""}"`
          }).save();
        }
        console.log(`🤖 [Bot Simulator] @${bot.username} liked tweet by @${tweetAuthor?.username || "unknown"}`);
      }
    } else {
      // RETWEET
      const hasRetweeted = tweet.retweetedBy.some(id => id.toString() === bot._id.toString());
      if (!hasRetweeted) {
        tweet.retweets += 1;
        tweet.retweetedBy.push(bot._id);
        await tweet.save();

        const tweetAuthor = await User.findById(tweet.author);
        if (tweetAuthor && !tweetAuthor.isBot) {
          await new Notification({
            recipient: tweet.author,
            sender: bot._id,
            type: "retweet",
            tweet: tweet._id,
            content: "reposted your post",
            extra: `"${tweet.content.slice(0, 60)}${tweet.content.length > 60 ? "…" : ""}"`
          }).save();
        }
        console.log(`🤖 [Bot Simulator] @${bot.username} retweeted tweet by @${tweetAuthor?.username || "unknown"}`);
      }
    }
  } catch (err) {
    console.error("[Bot Simulator] Error executing action:", err);
  }
};

export const startBotSimulator = (intervalMs = 45000) => {
  console.log(`🚀 [Bot Simulator] Service initialized. Running actions every ${intervalMs / 1000}s.`);
  
  // Seed first, then start intervals
  seedBotTweets().then(() => {
    // Run once immediately on start after 5 seconds
    setTimeout(runBotAction, 5000);
    setInterval(runBotAction, intervalMs);
  });
};
