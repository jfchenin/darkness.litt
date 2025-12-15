import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'
import { allLocales, themeConfig } from '@/config'

// Shared schema for both collections
const contentSchema = z.object({
  title: z.string(),
  author: z.string().optional().default('JFChenin'),
  published: z.date(),
  description: z.string().optional().default(''),
  updated: z.preprocess(val => val === '' ? undefined : val, z.date().optional()),
  tags: z.array(z.string()).optional().default([]),
  draft: z.boolean().optional().default(false),
  pin: z.number().int().min(0).max(99).optional().default(0),
  toc: z.boolean().optional().default(themeConfig.global.toc),
  lang: z.enum(['', ...allLocales]).optional().default(''),
  abbrlink: z.string().optional().default('').refine(
    abbrlink => !abbrlink || /^[a-z0-9\-]*$/.test(abbrlink),
    { message: 'Abbrlink ne peut contenir que des lettres minuscules, des chiffres et des traits d\'union.' },
  ),
})

const darkness = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/darkness' }),
  schema: contentSchema,
})

const emileMoselly = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/emileMoselly' }),
  schema: contentSchema,
})

const about = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/about' }),
  schema: z.object({ lang: z.enum(['', ...allLocales]).optional().default('') }),
})

const blogroll = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blogroll' }),
  schema: z.object({ lang: z.enum(['', ...allLocales]).optional().default('') }),
})

const legalNotices = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/legalNotices' }),
  schema: z.object({ lang: z.enum(['', ...allLocales]).optional().default('') }),
})

const privacyPolicy = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/privacyPolicy' }),
  schema: z.object({ lang: z.enum(['', ...allLocales]).optional().default('') }),
})

export const collections = { darkness, emileMoselly, about, blogroll, legalNotices, privacyPolicy }
