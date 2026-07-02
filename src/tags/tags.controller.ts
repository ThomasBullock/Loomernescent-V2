import { Controller, Get, Param, Render } from "@nestjs/common";
import { TagsService } from "./tags.service";

@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /** Renders all tags with all tagged bands. */
  @Get("tags")
  @Render("tags")
  async browse() {
    const [tags, bands] = await Promise.all([
      this.tagsService.getTagsList(),
      this.tagsService.getBandsByTag(),
    ]);
    return { title: "Tags", tags, bands };
  }

  /** Renders all tags with bands filtered to a specific tag. */
  @Get("tags/:tag")
  @Render("tags")
  async browseByTag(@Param("tag") tag: string) {
    const [tags, bands] = await Promise.all([
      this.tagsService.getTagsList(),
      this.tagsService.getBandsByTag(tag),
    ]);
    return { title: `Tags — ${tag}`, tags, bands, tag };
  }
}
