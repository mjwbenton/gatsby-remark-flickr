import { getPhoto, PhotoSource } from "@mattb.tech/flickr-api";

const FLICKR_PROTOCOL = "flickr://";

interface MarkdownNode {
  type: string;
  url?: string;
  alt?: string;
  value?: string;
  children?: MarkdownNode[];
}

interface ImageNode {
  type: "image";
  url: string;
  alt?: string;
}

function isImageNode(arg: MarkdownNode): arg is ImageNode {
  return arg.type == "image";
}

function getFlickrImageNodes(node: MarkdownNode): ImageNode[] {
  const result: ImageNode[] = [];
  if (isImageNode(node) && node.url.startsWith(FLICKR_PROTOCOL)) {
    result.push(node as ImageNode);
  }
  if (node.children) {
    node.children.forEach(child => result.push(...getFlickrImageNodes(child)));
  }
  return result;
}

function flickrPhotoIdForNode(node: ImageNode): string {
  return node.url.replace(FLICKR_PROTOCOL, "");
}

function generateSrcSet(sources: PhotoSource[]): string {
  return sources
    .map((source: PhotoSource) => [source.url, " ", source.width, "w"].join(""))
    .join(", ");
}

module.exports = async ({
  markdownAST
}: {
  markdownAST: MarkdownNode;
}): Promise<any> => {
  if (!process.env.FLICKR_API_KEY) {
    return;
  }
  const imageNodes = getFlickrImageNodes(markdownAST);
  await Promise.all(
    imageNodes.map(async node => {
      const response = await getPhoto(
        process.env.FLICKR_API_KEY!,
        flickrPhotoIdForNode(node)
      );
      const htmlNode = node as MarkdownNode;
      const src = response.mainSource.url;
      const srcset = generateSrcSet(response.sources);
      const alt = node.alt || response.title;
      htmlNode.type = "html";
      htmlNode.value = `<img src="${src}" srcset="${srcset}" alt="${alt}" />`;
      htmlNode.url = undefined;
      htmlNode.alt = undefined;
    })
  );
  return;
};
