import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

const generateAge = (age) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  return date;
};

// ---------------------------------------------------------------------------
// Main Seed Function
// ---------------------------------------------------------------------------

const createUserWithProfile = async (userData) => {
  const {
    email,
    password,
    phone,
    firstName,
    lastName,
    gender,
    age,
    originCountry,
    residenceCountry,
    residenceCity,
    ethnicity,
    languages,
    occupation,
    relationshipIntention,
    education,
    aboutMe,
    lifestyle,
    values,
    photos,
    voiceAnswers,
    matchPreference,
  } = userData;

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // ---------------------------------------------------------------------------
  // STEP 1: Create the User first (without profile)
  // ---------------------------------------------------------------------------
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      phone,
      verified: true,
      emailVerified: true,
      phoneVerified: true,
      isActive: true,
      status: "ACTIVE",
    },
  });

  console.log(`✅ Created user: ${email} (ID: ${user.id})`);

  // ---------------------------------------------------------------------------
  // STEP 2: Create Profile and all its relations
  // ---------------------------------------------------------------------------
  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      onboardingCompleted: true,
      completionPercent: 100,
      photosProcessingStatus: "READY",
      voiceProcessingStatus: "READY",

      // Identity
      identity: {
        create: {
          firstName,
          lastName,
          birthDate: generateAge(age),
          gender,
          originCountry,
          residenceCountry,
          residenceCity,
          ethnicity,
          languages,
          occupation,
          relationshipIntention,
          education,
        },
      },

      // Lifestyle
      lifestyle: {
        create: {
          drinking: lifestyle.drinking,
          smoking: lifestyle.smoking,
          socialLife: lifestyle.socialLife,
          fitnessImportance: lifestyle.fitnessImportance,
          moneyStyle: lifestyle.moneyStyle,
          relocationFeelings: lifestyle.relocationFeelings,
          financialStatus: lifestyle.financialStatus,
        },
      },

      // Values
      values: {
        create: {
          religion: values.religion,
          religionImportance: values.religionImportance,
          childrenPreference: values.childrenPreference,
          hasChildren: values.hasChildren || false,
          personalCommStyle: values.personalCommStyle,
          personalTuesdayVibe: values.personalTuesdayVibe,
        },
      },

      // Narrative
      narrative: {
        create: {
          aboutMe,
        },
      },
    },
  });

  console.log(`✅ Created profile for: ${email} (ID: ${profile.id})`);

  // ---------------------------------------------------------------------------
  // STEP 3: Create Profile Photos (now with valid userId and profileId)
  // ---------------------------------------------------------------------------
  if (photos && photos.length > 0) {
    await prisma.profilePhoto.createMany({
      data: photos.map((photo, index) => ({
        userId: user.id, // ✅ Now userId exists
        profileId: profile.id, // ✅ Now profileId exists
        url: photo.url,
        publicId: photo.publicId || `photo_${index}`,
        mimeType: photo.mimeType || "image/jpeg",
        size: photo.size || 100000,
        position: index,
        isPrimary: index === 0,
        status: "ACTIVE",
        moderationStatus: "APPROVED",
      })),
    });
    console.log(`✅ Created ${photos.length} photos for: ${email}`);
  }

  // ---------------------------------------------------------------------------
  // STEP 4: Create Voice Answers (with valid userId and profileId)
  // ---------------------------------------------------------------------------
  if (voiceAnswers && voiceAnswers.length > 0) {
    // First, ensure voice prompts exist
    const prompts = await prisma.voicePrompt.findMany();
    if (prompts.length === 0) {
      await createVoicePrompts();
    }

    await prisma.voiceAnswer.createMany({
      data: voiceAnswers.map((answer) => ({
        userId: user.id, // ✅ Now userId exists
        profileId: profile.id, // ✅ Now profileId exists
        voicePromptId: answer.promptId,
        url: answer.url,
        publicId: answer.publicId || `voice_${answer.promptId}`,
        mimeType: "audio/mpeg",
        size: answer.size || 50000,
        durationSeconds: answer.durationSeconds || 30,
        transcript: answer.transcript || null,
        status: "ACTIVE",
        moderationStatus: "APPROVED",
        language: answer.language || "en",
      })),
    });
    console.log(
      `✅ Created ${voiceAnswers.length} voice answers for: ${email}`,
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 5: Create Match Preference
  // ---------------------------------------------------------------------------
  if (matchPreference) {
    await prisma.matchPreference.create({
      data: {
        userId: user.id,
        preferredGenders: matchPreference.preferredGenders,
        ageMin: matchPreference.ageMin || 18,
        ageMax: matchPreference.ageMax || 99,
        locationPreference: matchPreference.locationPreference,
        religionPreference: matchPreference.religionPreference,
        culturePreference: matchPreference.culturePreference,
        childrenPreference: matchPreference.childrenPreference,
        faithPractice: matchPreference.faithPractice,
        energyDescription: matchPreference.energyDescription,
        communicationStyle: matchPreference.communicationStyle,
        tuesdayFeeling: matchPreference.tuesdayFeeling,
        energyMatchStyle: matchPreference.energyMatchStyle,
        ambitionImportance: matchPreference.ambitionImportance,
        socialLevel: matchPreference.socialLevel,
        lifestylePreference: matchPreference.lifestylePreference,
        financialStabilityPreference:
          matchPreference.financialStabilityPreference,
        financialStagePreference: matchPreference.financialStagePreference,
        idealPartnerType: matchPreference.idealPartnerType,
        matchVoicePrompt: matchPreference.matchVoicePrompt,
        minCompatibilityScore: matchPreference.minCompatibilityScore || 50,
      },
    });
    console.log(`✅ Created match preference for: ${email}`);
  }

  // ---------------------------------------------------------------------------
  // STEP 6: Create Wallet
  // ---------------------------------------------------------------------------
  await prisma.wallet.create({
    data: {
      userId: user.id,
      balance: 1000, // Give them some coins for testing
    },
  });
  console.log(`✅ Created wallet for: ${email}`);

  // ---------------------------------------------------------------------------
  // STEP 7: Return the complete user with all relations
  // ---------------------------------------------------------------------------
  return prisma.user.findUnique({
    where: { id: user.id },
    include: {
      profile: {
        include: {
          identity: true,
          lifestyle: true,
          values: true,
          narrative: true,
          profilePhotos: true,
        },
      },
      voiceAnswers: true,
      matchPreference: true,
      wallet: true,
    },
  });
};

// ---------------------------------------------------------------------------
// Create Voice Prompts
// ---------------------------------------------------------------------------

const createVoicePrompts = async () => {
  console.log("Creating voice prompts...");
  await prisma.voicePrompt.createMany({
    data: [
      {
        id: "prompt_1",
        question: "What are you most passionate about in life?",
        category: "Passions",
        isActive: true,
      },
      {
        id: "prompt_2",
        question: "What qualities do you value most in a partner?",
        category: "Relationships",
        isActive: true,
      },
      {
        id: "prompt_3",
        question: "Describe your ideal weekend.",
        category: "Lifestyle",
        isActive: true,
      },
      {
        id: "prompt_4",
        question: "What does happiness mean to you?",
        category: "Life Philosophy",
        isActive: true,
      },
      {
        id: "prompt_5",
        question: "Tell me about a book that changed your perspective.",
        category: "Intellectual",
        isActive: true,
      },
    ],
  });
  console.log("✅ Voice prompts created");
};

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const seedUsers = async () => {
  // User 1: Sarah - A creative soul
  const sarahData = {
    email: "sarah@example.com",
    password: "Password123!",
    phone: "+1234567890",
    firstName: "Sarah",
    lastName: "Johnson",
    gender: "WOMAN",
    age: 28,
    originCountry: "USA",
    residenceCountry: "USA",
    residenceCity: "New York",
    ethnicity: "Caucasian",
    languages: ["English", "Spanish"],
    occupation: "Graphic Designer",
    relationshipIntention: "Long-term relationship",
    education: "Bachelor's Degree",
    aboutMe:
      "I'm a creative soul who loves art, music, and exploring new places. I believe in living life to the fullest and finding beauty in the little things. Looking for someone who shares my passion for adventure and meaningful conversations.",
    lifestyle: {
      drinking: "Socially",
      smoking: "Never",
      socialLife: "Extroverted",
      fitnessImportance: "Moderately important",
      moneyStyle: "Balanced",
      relocationFeelings: "Maybe",
      financialStatus: "Stable",
    },
    values: {
      religion: "Spiritual but not religious",
      religionImportance: "Moderate",
      childrenPreference: "Want children",
      hasChildren: false,
      personalCommStyle: "Open and honest",
      personalTuesdayVibe: "Creative and inspired",
    },
    photos: [
      {
        url: "https://via.placeholder.com/400x400/FF6B6B/FFFFFF?text=Sarah+1",
        publicId: "sarah_photo_1",
        mimeType: "image/jpeg",
        size: 150000,
      },
      {
        url: "https://via.placeholder.com/400x400/4ECDC4/FFFFFF?text=Sarah+2",
        publicId: "sarah_photo_2",
        mimeType: "image/jpeg",
        size: 140000,
      },
      {
        url: "https://via.placeholder.com/400x400/45B7D1/FFFFFF?text=Sarah+3",
        publicId: "sarah_photo_3",
        mimeType: "image/jpeg",
        size: 130000,
      },
    ],
    voiceAnswers: [
      {
        promptId: "prompt_1",
        url: "https://example.com/voice/sarah_answer1.mp3",
        publicId: "sarah_voice_1",
        durationSeconds: 25,
        transcript:
          "I love spending my weekends exploring art galleries and trying new restaurants.",
        language: "en",
        size: 45000,
      },
      {
        promptId: "prompt_2",
        url: "https://example.com/voice/sarah_answer2.mp3",
        publicId: "sarah_voice_2",
        durationSeconds: 30,
        transcript:
          "My ideal partner is someone who is kind, adventurous, and has a great sense of humor.",
        language: "en",
        size: 50000,
      },
    ],
    matchPreference: {
      preferredGenders: ["MAN"],
      ageMin: 26,
      ageMax: 35,
      locationPreference: "Same city",
      religionPreference: "Open to all",
      culturePreference: "Open to all cultures",
      childrenPreference: "Want children",
      faithPractice: "Occasionally",
      energyDescription: "Creative and passionate",
      communicationStyle: "Open and direct",
      tuesdayFeeling: "Productive",
      energyMatchStyle: "Balanced",
      ambitionImportance: "Important",
      socialLevel: "Social",
      lifestylePreference: "Social drinker ok",
      financialStabilityPreference: "Stable",
      financialStagePreference: "Growing",
      idealPartnerType: "Kind and adventurous",
      matchVoicePrompt: "Tell me about your ideal weekend",
      minCompatibilityScore: 50,
    },
  };

  // User 2: James - A tech enthusiast
  const jamesData = {
    email: "james@example.com",
    password: "Password123!",
    phone: "+1987654321",
    firstName: "James",
    lastName: "Wilson",
    gender: "MAN",
    age: 30,
    originCountry: "Canada",
    residenceCountry: "USA",
    residenceCity: "New York",
    ethnicity: "Caucasian",
    languages: ["English", "French"],
    occupation: "Software Engineer",
    relationshipIntention: "Long-term relationship",
    education: "Master's Degree",
    aboutMe:
      "Tech enthusiast by day, musician by night. I love building things, whether it's code or a new song. I'm looking for someone who can match my intellectual curiosity and doesn't take life too seriously.",
    lifestyle: {
      drinking: "Never",
      smoking: "Never",
      socialLife: "Balanced",
      fitnessImportance: "Very important",
      moneyStyle: "Savings focused",
      relocationFeelings: "Open to relocate",
      financialStatus: "Financially independent",
    },
    values: {
      religion: "Agnostic",
      religionImportance: "Not important",
      childrenPreference: "Open to children",
      hasChildren: false,
      personalCommStyle: "Direct and honest",
      personalTuesdayVibe: "Focused and ambitious",
    },
    photos: [
      {
        url: "https://via.placeholder.com/400x400/FF6B6B/FFFFFF?text=James+1",
        publicId: "james_photo_1",
        mimeType: "image/jpeg",
        size: 160000,
      },
      {
        url: "https://via.placeholder.com/400x400/4ECDC4/FFFFFF?text=James+2",
        publicId: "james_photo_2",
        mimeType: "image/jpeg",
        size: 145000,
      },
      {
        url: "https://via.placeholder.com/400x400/45B7D1/FFFFFF?text=James+3",
        publicId: "james_photo_3",
        mimeType: "image/jpeg",
        size: 135000,
      },
    ],
    voiceAnswers: [
      {
        promptId: "prompt_1",
        url: "https://example.com/voice/james_answer1.mp3",
        publicId: "james_voice_1",
        durationSeconds: 28,
        transcript:
          "I'm really passionate about technology and how it can make the world a better place.",
        language: "en",
        size: 48000,
      },
      {
        promptId: "prompt_2",
        url: "https://example.com/voice/james_answer2.mp3",
        publicId: "james_voice_2",
        durationSeconds: 32,
        transcript:
          "I think the most important thing in a relationship is trust and communication.",
        language: "en",
        size: 52000,
      },
    ],
    matchPreference: {
      preferredGenders: ["WOMAN"],
      ageMin: 25,
      ageMax: 35,
      locationPreference: "Same city",
      religionPreference: "Open to all",
      culturePreference: "Open to all cultures",
      childrenPreference: "Open to children",
      faithPractice: "Rarely",
      energyDescription: "Focused and ambitious",
      communicationStyle: "Direct and honest",
      tuesdayFeeling: "Motivated",
      energyMatchStyle: "Complementary",
      ambitionImportance: "Very important",
      socialLevel: "Balanced",
      lifestylePreference: "Sober only",
      financialStabilityPreference: "Stable",
      financialStagePreference: "Advanced",
      idealPartnerType: "Intelligent and kind",
      matchVoicePrompt: "What does your ideal future look like?",
      minCompatibilityScore: 50,
    },
  };

  // ---------------------------------------------------------------------------
  // Create Users
  // ---------------------------------------------------------------------------

  console.log("\n📝 Creating test users...\n");

  const sarah = await createUserWithProfile(sarahData);
  const james = await createUserWithProfile(jamesData);

  // ---------------------------------------------------------------------------
  // Create Match Between Sarah and James
  // ---------------------------------------------------------------------------

  console.log("\n💝 Creating match between Sarah and James...");

  // Sort IDs for consistent ordering
  const [userAId, userBId] = [sarah.id, james.id].sort();

  const match = await prisma.match.create({
    data: {
      userAId,
      userBId,
      status: "ACTIVE",
      matchedAt: new Date(),
    },
  });
  console.log(`✅ Created match (ID: ${match.id})`);

  // ---------------------------------------------------------------------------
  // Create Match Requests (Mutual interest)
  // ---------------------------------------------------------------------------

  console.log("📨 Creating match requests...");

  // James sends a match request to Sarah
  await prisma.matchRequest.create({
    data: {
      senderId: james.id,
      receiverId: sarah.id,
      type: "LIKE",
      status: "ACCEPTED",
      respondedAt: new Date(),
      message:
        "Hey Sarah! I came across your profile and I think we have a lot in common. Would love to chat!",
    },
  });

  // Sarah sends a match request back (mutual)
  await prisma.matchRequest.create({
    data: {
      senderId: sarah.id,
      receiverId: james.id,
      type: "LIKE",
      status: "ACCEPTED",
      respondedAt: new Date(),
      message:
        "Hi James! I was just thinking the same thing. Your profile caught my eye too.",
    },
  });
  console.log("✅ Created match requests");

  // ---------------------------------------------------------------------------
  // Create Compatibility Score
  // ---------------------------------------------------------------------------

  console.log("📊 Creating compatibility score...");

  await prisma.compatibilityScore.create({
    data: {
      userAId,
      userBId,
      score: 85,
      identityScore: 25,
      lifestyleScore: 20,
      valuesScore: 25,
      locationScore: 15,
      reasons: {
        matched: [
          "Gender preference matched",
          "Age 30 within 26-35",
          "Same city",
          "Religion matched",
          "Children preference matched",
          "Communication style matched",
          "Lifestyle habits compatible",
          "Social level matched",
        ],
        missed: [],
      },
    },
  });
  console.log("✅ Created compatibility score");

  // ---------------------------------------------------------------------------
  // Create Match Results
  // ---------------------------------------------------------------------------

  console.log("🎯 Creating match results...");

  const compScore = await prisma.compatibilityScore.findFirst({
    where: { userAId, userBId },
  });

  // Sarah's discovery results (shows James)
  await prisma.matchResult.create({
    data: {
      viewerId: sarah.id,
      candidateId: james.id,
      compatibilityScoreId: compScore.id,
      score: 85,
      rank: 1,
      reason: "COMPATIBLE",
      dismissed: false,
    },
  });

  // James's discovery results (shows Sarah)
  await prisma.matchResult.create({
    data: {
      viewerId: james.id,
      candidateId: sarah.id,
      compatibilityScoreId: compScore.id,
      score: 85,
      rank: 1,
      reason: "COMPATIBLE",
      dismissed: false,
    },
  });
  console.log("✅ Created match results");

  // ---------------------------------------------------------------------------
  // Create Some Initial Messages
  // ---------------------------------------------------------------------------

  console.log("💬 Creating conversation and messages...");

  // Create conversation for the match
  const conversation = await prisma.conversation.create({
    data: {
      matchId: match.id,
      userAId: userAId,
      userBId: userBId,
      status: "ACTIVE",
      stage: 1,
    },
  });
  console.log(`✅ Created conversation (ID: ${conversation.id})`);

  // Create messages
  const message1 = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: james.id,
      type: "TEXT",
      body: "Hey Sarah! I'm so glad we matched. I saw you're a graphic designer - that's awesome! What kind of projects do you work on?",
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    },
  });

  const message2 = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: sarah.id,
      type: "TEXT",
      body: "Hi James! Thanks for reaching out. I actually work on branding and web design, mostly for startups. I saw you're a software engineer - what do you specialize in?",
      createdAt: new Date(Date.now() - 1800000), // 30 min ago
    },
  });

  const message3 = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: james.id,
      type: "TEXT",
      body: "That's cool! I work with React and Node.js mostly. I actually build a lot of web apps. Maybe we could collaborate on a project sometime?",
      createdAt: new Date(Date.now() - 600000), // 10 min ago
    },
  });

  // Update conversation with last message
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageId: message3.id,
      lastMessageAt: message3.createdAt,
      lastActivityAt: new Date(),
    },
  });

  console.log(`✅ Created ${3} messages`);

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log("\n📊 ========== SEEDING COMPLETE! ==========");
  console.log(`👤 Sarah ID: ${sarah.id}`);
  console.log(`   Email: sarah@example.com`);
  console.log(`   Password: Password123!`);
  console.log(`👤 James ID: ${james.id}`);
  console.log(`   Email: james@example.com`);
  console.log(`   Password: Password123!`);
  console.log(`💝 Match ID: ${match.id}`);
  console.log(`💬 Conversation ID: ${conversation.id}`);
  console.log(`📊 Compatibility Score: 85%`);
  console.log("===========================================\n");

  return {
    sarah,
    james,
    match,
    conversation,
  };
};

// ---------------------------------------------------------------------------
// Main Seed Function
// ---------------------------------------------------------------------------

async function main() {
  try {
    console.log("🌱 Starting seed...");

    // Check if voice prompts exist, create if not
    const existingPrompts = await prisma.voicePrompt.findMany();
    if (existingPrompts.length === 0) {
      await createVoicePrompts();
    }

    // Optional: Clean up existing test data
    // Uncomment if you want fresh data each time
    // console.log("🧹 Cleaning up existing test data...");
    // await prisma.matchResult.deleteMany();
    // await prisma.matchRequest.deleteMany();
    // await prisma.message.deleteMany();
    // await prisma.conversation.deleteMany();
    // await prisma.match.deleteMany();
    // await prisma.voiceAnswer.deleteMany();
    // await prisma.profilePhoto.deleteMany();
    // await prisma.compatibilityScore.deleteMany();
    // await prisma.matchPreference.deleteMany();
    // await prisma.profile.deleteMany();
    // await prisma.user.deleteMany({ where: { email: { in: ["sarah@example.com", "james@example.com"] } } });

    await seedUsers();

    console.log("✅ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
main();

// ---------------------------------------------------------------------------
// Export for testing
// ---------------------------------------------------------------------------

export { createUserWithProfile, seedUsers };
