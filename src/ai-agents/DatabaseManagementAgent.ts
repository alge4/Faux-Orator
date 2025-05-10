import { BaseAgent, AgentContext, AgentResponse } from "./BaseAgent";
import { supabase } from "../services/supabase";
import { openAIService } from "../services/openai";

interface DatabaseOperation {
  table: string;
  operation: "insert" | "update" | "delete" | "query";
  data?: any;
  conditions?: any;
}

interface DatabaseManagementInput {
  operation: DatabaseOperation | DatabaseOperation[];
  context?: {
    campaignId: string;
    userId: string;
    sourceDocument?: {
      content: string;
      type: string;
      name: string;
    };
  };
}

export class DatabaseManagementAgent extends BaseAgent {
  private readonly tableSchemas: Record<string, any>;

  constructor(context: AgentContext) {
    super(context);
    // Define table schemas for validation and AI context
    this.tableSchemas = {
      campaigns: {
        fields: ["name", "description", "setting", "theme", "owner_id"],
        relationships: ["campaign_members", "npcs", "locations"],
      },
      npcs: {
        fields: [
          "name",
          "type",
          "description",
          "personality",
          "goals",
          "secrets",
          "appearance",
          "history",
          "campaign_id",
        ],
        relationships: ["campaigns", "locations"],
      },
      locations: {
        fields: ["name", "description", "campaign_id", "parent_location_id"],
        relationships: ["campaigns", "npcs"],
      },
      // Add other table schemas as needed
    };
  }

  async process(input: DatabaseManagementInput): Promise<AgentResponse> {
    try {
      this.validateInput(input);
      await this.logAction("database_management_request", input);

      // If source document exists, first extract structured data
      let structuredData = input.context?.sourceDocument
        ? await this.extractStructuredData(input.context.sourceDocument)
        : null;

      // Process operations
      const operations = Array.isArray(input.operation)
        ? input.operation
        : [input.operation];
      const results = await Promise.all(
        operations.map((op) => this.processOperation(op, structuredData))
      );

      await this.logAction("database_management_response", { input, results });

      return {
        success: true,
        message: "Database operations completed successfully",
        data: results,
      };
    } catch (error) {
      return this.handleError(error as Error);
    }
  }

  private async extractStructuredData(document: {
    content: string;
    type: string;
    name: string;
  }) {
    const systemPrompt = this.createDataExtractionPrompt();

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Extract structured data from the following ${document.type} document named "${document.name}":\n\n${document.content}`,
      },
    ];

    const response = await openAIService.getChatCompletion(
      messages,
      {
        temperature: 0.2, // Lower temperature for more consistent structured data
        response_format: { type: "json_object" },
      },
      this.context.sessionId,
      this.context.campaignId
    );

    try {
      return JSON.parse(response.content || "{}");
    } catch (error) {
      console.error("Failed to parse structured data:", error);
      throw new Error("Failed to extract structured data from document");
    }
  }

  private createDataExtractionPrompt(): string {
    return `You are a specialized AI agent responsible for extracting structured data from D&D campaign documents.
Your task is to analyze the provided document and extract relevant information that matches our database schema:

${JSON.stringify(this.tableSchemas, null, 2)}

Requirements:
1. Extract only factual information present in the document
2. Maintain relationships between entities
3. Format data according to the schema
4. Return data in a structured JSON format
5. Use null for missing optional fields
6. Validate data types match schema requirements

Return format example:
{
  "campaigns": [{
    "name": "Campaign Name",
    "description": "Description",
    ...
  }],
  "npcs": [{
    "name": "NPC Name",
    "type": "NPC Type",
    ...
  }],
  "locations": [{
    "name": "Location Name",
    "description": "Description",
    ...
  }]
}`;
  }

  private async processOperation(
    operation: DatabaseOperation,
    structuredData: any | null
  ): Promise<any> {
    const { table, operation: opType, data, conditions } = operation;

    // Validate operation against schema
    this.validateOperation(table, opType, data);

    // If we have structured data and this is an insert/update, merge it
    const finalData =
      opType === "insert" || opType === "update"
        ? this.mergeStructuredData(table, data, structuredData)
        : data;

    // Perform database operation
    switch (opType) {
      case "insert":
        const { data: inserted, error: insertError } = await supabase
          .from(table)
          .insert(finalData)
          .select();
        if (insertError) throw insertError;
        return inserted;

      case "update":
        const { data: updated, error: updateError } = await supabase
          .from(table)
          .update(finalData)
          .match(conditions || {})
          .select();
        if (updateError) throw updateError;
        return updated;

      case "delete":
        const { data: deleted, error: deleteError } = await supabase
          .from(table)
          .delete()
          .match(conditions || {})
          .select();
        if (deleteError) throw deleteError;
        return deleted;

      case "query":
        const { data: queried, error: queryError } = await supabase
          .from(table)
          .select("*")
          .match(conditions || {});
        if (queryError) throw queryError;
        return queried;

      default:
        throw new Error(`Unsupported operation type: ${opType}`);
    }
  }

  private validateOperation(table: string, opType: string, data?: any) {
    if (!this.tableSchemas[table]) {
      throw new Error(`Invalid table: ${table}`);
    }

    if (data && (opType === "insert" || opType === "update")) {
      const schema = this.tableSchemas[table];
      const invalidFields = Object.keys(data).filter(
        (field) => !schema.fields.includes(field)
      );
      if (invalidFields.length > 0) {
        throw new Error(
          `Invalid fields for table ${table}: ${invalidFields.join(", ")}`
        );
      }
    }
  }

  private mergeStructuredData(
    table: string,
    data: any,
    structuredData: any | null
  ): any {
    if (!structuredData || !structuredData[table]) {
      return data;
    }

    // Merge structured data with provided data, preferring provided data
    return {
      ...structuredData[table][0], // Assume first entry for the table
      ...data,
    };
  }
}
