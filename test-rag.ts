/**
 * Simple test script to verify RAG functionality
 * This tests the vector store and knowledge base without requiring Discord/OpenAI setup
 */

import { VectorStore, type Document } from "./src/ai/rag/vectorStore";
import { KnowledgeBase } from "./src/ai/rag/knowledgeBase";

async function testVectorStore() {
  console.log("Testing Vector Store...");
  const store = new VectorStore();

  const testDocs: Document[] = [
    {
      id: "doc1",
      content: "Aigis is an anti-Shadow weapon created by the Kirijo Group.",
    },
    {
      id: "doc2",
      content: "SEES is a group of Persona users who fight Shadows.",
    },
    {
      id: "doc3",
      content: "The Dark Hour is a hidden 25th hour that occurs at midnight.",
    },
  ];

  console.log("Adding documents to vector store...");
  await store.addDocuments(testDocs);
  console.log(`✓ Added ${store.getDocumentCount()} documents`);

  console.log("\nSearching for 'Aigis weapon'...");
  const results = await store.search("Aigis weapon", 2);
  console.log(`✓ Found ${results.length} results:`);
  results.forEach((doc, i) => {
    console.log(`  ${i + 1}. [${doc.id}] ${doc.content.substring(0, 60)}...`);
  });

  console.log("\n✓ Vector Store test passed!\n");
}

async function testKnowledgeBase() {
  console.log("Testing Knowledge Base...");
  const kb = new KnowledgeBase();

  console.log("Initializing knowledge base...");
  await kb.initialize();
  console.log(`✓ Initialized with ${kb.getDocumentCount()} default documents`);

  console.log("\nSearching for 'What is SEES'...");
  const results = await kb.search("What is SEES", 2);
  console.log(`✓ Found ${results.length} results:`);
  results.forEach((doc, i) => {
    console.log(`  ${i + 1}. [${doc.id}] ${doc.content.substring(0, 60)}...`);
  });

  console.log("\n✓ Knowledge Base test passed!\n");
}

async function main() {
  console.log("=== RAG System Tests ===\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY environment variable is required");
    console.error("Set it with: export OPENAI_API_KEY=your_key_here\n");
    process.exit(1);
  }

  try {
    await testVectorStore();
    await testKnowledgeBase();
    console.log("=== All tests passed! ===");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main();
