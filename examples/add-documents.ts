/**
 * Example script showing how to add custom documents to the knowledge base
 */

import { knowledgeBase } from "../src/ai/rag/knowledgeBase";

async function addCustomDocuments() {
  console.log("Initializing knowledge base...");
  await knowledgeBase.initialize();
  console.log(
    `Initialized with ${knowledgeBase.getDocumentCount()} default documents`,
  );

  console.log("\nAdding custom documents...");

  await knowledgeBase.addDocument({
    id: "custom-1",
    content:
      "Aigis's Persona is Athena, a powerful Persona of the Chariot Arcana. Athena is known for her defensive capabilities and support abilities.",
    metadata: {
      category: "persona",
      topic: "Aigis abilities",
    },
  });

  await knowledgeBase.addDocument({
    id: "custom-2",
    content:
      "The Velvet Room is a mysterious place between dream and reality, mind and matter. It is run by Igor and his assistants, who help Persona users unlock their potential.",
    metadata: {
      category: "location",
      topic: "Velvet Room",
    },
  });

  await knowledgeBase.addDocument({
    id: "custom-3",
    content:
      "Tartarus is a massive tower that appears during the Dark Hour. It is the main dungeon in Persona 3 where SEES explores and fights Shadows. The tower has multiple blocks, each with increasing difficulty.",
    metadata: {
      category: "location",
      topic: "Tartarus",
    },
  });

  console.log(
    `✓ Added custom documents. Total: ${knowledgeBase.getDocumentCount()} documents`,
  );

  console.log("\nTesting search with custom documents...");
  const results = await knowledgeBase.search("Tell me about Tartarus", 2);
  console.log(`Found ${results.length} results:`);
  results.forEach((doc, i) => {
    console.log(`\n${i + 1}. [${doc.id}]`);
    console.log(`   ${doc.content}`);
  });
}

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Error: OPENAI_API_KEY environment variable is required");
  console.error("Set it with: export OPENAI_API_KEY=your_key_here");
  process.exit(1);
}

addCustomDocuments().catch(console.error);
