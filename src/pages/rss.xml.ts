import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
    // 获取所有已发布的博客文章
    const blogPosts = await getCollection('blog', ({ data }) => {
        return !data.draft && data.publishDate < new Date();
    });

    // 按发布日期排序（最新的在前）
    blogPosts.sort((a, b) => {
        return b.data.publishDate.valueOf() - a.data.publishDate.valueOf();
    });

    const siteUrl = site?.toString().replace(/\/$/, '') || 'https://describemusic.net';
    const blogUrl = `${siteUrl}/blog`;

    // 生成 RSS XML
    const rssItems = blogPosts.map((post) => {
        const postUrl = `${siteUrl}/blog/${post.slug}`;
        const pubDate = post.data.publishDate.toUTCString();
        const imageUrl = post.data.image?.src
            ? post.data.image.src.startsWith('http')
                ? post.data.image.src
                : `${siteUrl}${post.data.image.src}`
            : '';

        return `
    <item>
      <title><![CDATA[${post.data.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${post.data.snippet}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${post.data.author}</author>
      ${imageUrl ? `<enclosure url="${imageUrl}" type="image/jpeg" />` : ''}
      <category>${post.data.category}</category>
      ${post.data.tags.map((tag: string) => `<category>${tag}</category>`).join('\n      ')}
    </item>`;
    }).join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:sy="http://purl.org/rss/1.0/modules/syndication/" xmlns:slash="http://purl.org/rss/1.0/modules/slash/">
  <channel>
    <title>Describe Music Blog - AI Audio Analysis Insights & Tutorials</title>
    <link>${blogUrl}</link>
    <description>Expert insights on AI audio analysis, developer guides, and industry trends to help you master audio technology.</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <generator>Astro</generator>
    ${rssItems}
  </channel>
</rss>`;

    return new Response(rss, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
};

