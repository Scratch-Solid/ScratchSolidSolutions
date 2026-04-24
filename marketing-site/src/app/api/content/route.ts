import { NextRequest, NextResponse } from "next/server";
import { directus } from "../../directusClient";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "privacy";

    // Fetch from Directus CMS based on content type
    let collection = "";
    switch (type) {
      case "privacy":
        collection = "privacy_policy";
        break;
      case "terms":
        collection = "terms_of_service";
        break;
      case "contact":
        collection = "contact_info";
        break;
      case "services":
        collection = "services";
        break;
      case "about":
        collection = "about_us";
        break;
      default:
        collection = "privacy_policy";
    }

    const result = await directus.items(collection).readByQuery({
      limit: 1,
      fields: ["*"]
    });

    if (result.data && result.data.length > 0) {
      const contentData = result.data[0] as any;
      const content = contentData.content || contentData.description || "";
      return NextResponse.json({ content, type });
    }

    // Fallback if no data in Directus
    return NextResponse.json({ 
      content: "Content not available. Please contact admin.",
      type 
    }, { status: 404 });
  } catch (error) {
    console.error("Error loading content from Directus:", error);
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "privacy";
    const body = await request.json() as { content?: string };
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Map content type to Directus collection
    let collection = "";
    switch (type) {
      case "privacy":
        collection = "privacy_policy";
        break;
      case "terms":
        collection = "terms_of_service";
        break;
      case "contact":
        collection = "contact_info";
        break;
      case "services":
        collection = "services";
        break;
      case "about":
        collection = "about_us";
        break;
      default:
        collection = "privacy_policy";
    }

    // Check if record exists
    const existing = await directus.items(collection).readByQuery({
      limit: 1,
      fields: ["id"]
    });

    if (existing.data && existing.data.length > 0) {
      // Update existing record
      const recordId = existing.data[0].id;
      await directus.items(collection).updateOne(recordId, { content });
    } else {
      // Create new record
      await directus.items(collection).createOne({ content });
    }

    return NextResponse.json({ message: "Content updated successfully" });
  } catch (error) {
    console.error("Error updating content in Directus:", error);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}
