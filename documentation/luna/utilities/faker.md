---
layout: doc
description: Luna's Faker provider and Lorem classes for seeding CJK text, placeholder images, and avatars.
---

# Faker

Seeders fill a development database with fake content. The stock Faker
library covers English well, but a Luna site is often multilingual:
Latin Lorem Ipsum in a Traditional Chinese article list looks wrong, and
every record needs a cover image and an author avatar. Luna extends Faker
with:

- A provider that returns placeholder image and avatar URLs.
- Lorem classes that generate Chinese and Japanese text.

Faker is a seeding tool. Use it from seeders, not from production code.

## Enabling the Provider

Luna registers its provider in `LunaPackage` by listening to the
`faker.created` event of `Windwalker\Core\Seed\FakerService`. Every
generator that `FakerService` creates already has the provider. Seeders
get one through `faker()`:

```php
$faker = $this->faker('en_US');

$faker->unsplashImage(800, 600);
$faker->avatar(400);
```

See [Seeders](/documentation/framework/services/database/seeders) for how
seeders and `FakerService` work.

## Complete Example

Luna's own seeders use the provider for cover images and avatars. A
seeder that creates localized articles looks like this:

```php
use Lyrasoft\Luna\Entity\Article;
use Windwalker\Core\Seed\AbstractSeeder;
use Windwalker\Core\Seed\SeedImport;

return new class () extends AbstractSeeder {
    #[SeedImport]
    public function import(): void
    {
        $mapper = $this->orm->mapper(Article::class);

        foreach (range(1, 50) as $i) {
            $lang = $this->faker('en_US')->randomElement(
                ['en_US', 'zh_TW', 'ja_JP']
            );
            $faker = $this->faker($lang);

            $item = $mapper->createEntity();
            $item->title = $faker->sentence(3);
            $item->image = $faker->unsplashImage(800, 600);
            $item->introtext = $faker->paragraph(5);
            $item->fulltext = $faker->paragraph(20);
            $item->language = str_replace('_', '-', $lang);

            $mapper->createOne($item);
        }
    }
};
```

The `zh_TW` and `ja_JP` text above is Chinese and Japanese only after the
Lorem classes are registered. See the next section.

## Placeholder Images

```php
// A random image URL. Defaults to 800x600.
$url = $faker->unsplashImage();
$url = $faker->unsplashImage(1200, 630);

// A fixed image by id, for a stable result.
$url = $faker->unsplashImage(800, 600, 10);

// A list of URLs. Width and height accept [min, max] for random sizes.
$urls = $faker->unsplashImages(5, [600, 1000], [400, 800]);

// The same list encoded as JSON, for a JSON column.
$json = $faker->unsplashImagesJson(5, 800, 600);

// A unique avatar URL on every call.
$avatar = $faker->avatar(300);

// The same user string returns the same avatar.
$avatar = $faker->avatar(300, 'alice@example.com');
```

The method names say Unsplash, but the images come from
`https://picsum.photos`. Image ids come from a list cached at
`WINDWALKER_TEMP/luna/images/picsum-list.data`. When the cache is missing,
`UnsplashHelper` fetches the list from the Picsum API and falls back to a
copy bundled with Luna if the request fails. Avatars use
`https://i.pravatar.cc`. Seeding only stores URLs, so the images are
requested when a page is rendered.

::: tip
Call `UnsplashHelper::setImageListHandler()` to change how the id list is
requested, for example to add a proxy or headers.
:::

## Chinese and Japanese Lorem

Faker has no Lorem provider for `zh_TW`, `zh_CN`, or `ja_JP`, so
`sentence()` and `paragraph()` fall back to Latin text. Luna ships three
replacements under `Lyrasoft\Luna\Faker`:

- `zh_TW\Lorem`: words from the I Ching, in Traditional Chinese.
- `zh_CN\Lorem`: words from the Three Character Classic.
- `ja_JP\Lorem`: a Japanese word list.

Register them with `FakerHelper` before any seeder asks for that locale.
A host app usually does this in its `main.seeder.php`:

```php
use Lyrasoft\Luna\Faker\FakerHelper;

// All three at once.
FakerHelper::registerMoreLoremClasses();

// Or one locale at a time.
FakerHelper::registerChineseLorem();     // zh_TW
FakerHelper::registerCNLorem();          // zh_CN
FakerHelper::registerJapaneseLorem();    // ja_JP
```

After registration, the generator for that locale produces text in the
language:

```php
$faker = $this->faker('zh_TW');

$faker->word();
$faker->sentence(3);
$faker->paragraph(5);
$faker->text(200);
```

`FakerHelper` does this with `class_alias()`, mapping Luna's class to
`Faker\Provider\<locale>\Lorem`. Each locale is aliased once, and the
Chinese registration also replaces `Faker\Provider\zh_TW\Internet`.

::: warning
Register before the first `faker('zh_TW')` call. The alias cannot replace
a Faker class that is already loaded, and PHP reports an error instead.
:::

### Custom Word Lists

Each Lorem class keeps its words in a static list. Replace it to generate
text from your own vocabulary:

```php
use Lyrasoft\Luna\Faker\zh_TW\Lorem;

// An array of words.
Lorem::setWordList(['產品', '服務', '團隊', '活動']);

// Or a string with one word per line.
Lorem::setWordList("產品\n服務\n團隊\n活動");
```

Blank entries are removed. The list is static, so it applies to every
generator in the process.

### Usernames and Emails

The Traditional Chinese `Internet` provider makes `userName()` free of
spaces. When the optional `thl/pinyin` package is installed, it also
transliterates Chinese names into Pinyin, so `email()` and `userName()`
stay readable:

```bash
composer require thl/pinyin
```

```php
$faker = $this->faker('zh_TW');

$faker->userName();
$faker->email();
```

## Related

- [Seeders](/documentation/framework/services/database/seeders)
