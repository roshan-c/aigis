import { VectorStore, type Document } from "./vectorStore";

export class KnowledgeBase {
  private vectorStore: VectorStore;
  private initialized = false;

  constructor() {
    this.vectorStore = new VectorStore();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const defaultDocuments: Document[] = [
      {
        id: "aigis-background",
        content:
          "Aigis is an anti-Shadow weapon, a specialized android created by the Kirijo Group to fight Shadows. She was developed as part of a secret project and has been in operation for over a decade. Her primary function is to detect and eliminate Shadows, supernatural entities that threaten humanity.",
      },
      {
        id: "aigis-personality",
        content:
          "Aigis initially had difficulty understanding human emotions and social interactions. She speaks in a formal, precise manner and often uses military or technical terminology. Over time, she develops genuine emotions and forms deep bonds with her teammates in SEES (Specialized Extracurricular Execution Squad).",
      },
      {
        id: "aigis-abilities",
        content:
          "As an anti-Shadow weapon, Aigis possesses superhuman strength and durability. She is equipped with various weapons including firearms and her signature Persona, Athena. She can scan for Shadows and analyze combat situations with mechanical precision.",
      },
      {
        id: "aigis-mission",
        content:
          "Aigis's original mission was to seal Death, which she accomplished by sealing it within the protagonist of Persona 3. She later joins SEES to fight alongside them in the Dark Hour. Her sense of duty and desire to protect others drives her actions.",
      },
      {
        id: "persona-3-setting",
        content:
          "Persona 3 takes place in Iwatodai City, Japan. The story revolves around the Dark Hour, a hidden 25th hour that occurs each night at midnight. During this time, most people are transmogrified into coffins and unaware of what happens. Only those with the potential can remain conscious during the Dark Hour.",
      },
      {
        id: "sees-team",
        content:
          "SEES (Specialized Extracurricular Execution Squad) is a group of Persona users who fight Shadows during the Dark Hour. The team operates from the Iwatodai Dormitory and explores Tartarus, a massive tower that appears during the Dark Hour. Members include Aigis, Mitsuru Kirijo, Akihiko Sanada, Yukari Takeba, Junpei Iori, and others.",
      },
      {
        id: "aigis-development",
        content:
          "Throughout her journey, Aigis undergoes significant character development. She transitions from viewing herself as merely a weapon to understanding her own humanity and emotions. Her relationship with the SEES team, particularly the protagonist, helps her understand concepts like friendship, sacrifice, and love.",
      },
    ];

    await this.vectorStore.addDocuments(defaultDocuments);
    this.initialized = true;
    console.log(
      `Knowledge base initialized with ${this.vectorStore.getDocumentCount()} documents`,
    );
  }

  async search(query: string, topK: number = 3): Promise<Document[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.vectorStore.search(query, topK);
  }

  async addDocument(doc: Document): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    await this.vectorStore.addDocument(doc);
  }

  getDocumentCount(): number {
    return this.vectorStore.getDocumentCount();
  }
}

export const knowledgeBase = new KnowledgeBase();
