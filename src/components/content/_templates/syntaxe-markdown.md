Voici quelques exemples de syntaxe Markdown de base et leurs effets stylistiques dans Retypeset.

## Titres

Pour créer des titres, ajoutez des dièses `#` devant un mot ou une phrase. Le nombre de dièses utilisés correspond au niveau du titre.

### Syntaxe

```
# Titre 1
## Titre 2
### Titre 3
#### Titre 4
##### Titre 5
###### Titre 6
```

### Rendu

# Titre 1

## Titre 2

### Titre 3

#### Titre 4

##### Titre 5

###### Titre 6

## Paragraphes

Pour créer des paragraphes, utilisez une ligne vide pour séparer une ou plusieurs lignes de texte.

### Syntaxe

```
Xerum, quo qui aut unt expliquam qui dolut labo. Aque venitatiusda cum, voluptionse latur sitiae dolessi aut parist aut dollo enim qui voluptate ma dolestendit peritin re plis aut quas inctum laceat est volestemque commosa as cus endigna tectur, offic to cor sequas etum rerum idem sintibus eiur? Quianimin porecus evelectur, cum que nis nust voloribus ratem aut omnimi, sitatur? Quiatem. Nam, omnis sum am facea corem alique molestrunt et eos evelece arcillit ut aut eos eos nus, sin conecerem erum fuga. Ri oditatquam, ad quibus unda veliamenimin cusam et facea ipsamus es exerum sitate dolores editium rerore eost, temped molorro ratiae volorro te reribus dolorer sperchicium faceata tiustia prat.

Itatur? Quiatae cullecum rem ent aut odis in re eossequodi nonsequ idebis ne sapicia is sinveli squiatum, core et que aut hariosam ex eat.
```

### Rendu

Xerum, quo qui aut unt expliquam qui dolut labo. Aque venitatiusda cum, voluptionse latur sitiae dolessi aut parist aut dollo enim qui voluptate ma dolestendit peritin re plis aut quas inctum laceat est volestemque commosa as cus endigna tectur, offic to cor sequas etum rerum idem sintibus eiur? Quianimin porecus evelectur, cum que nis nust voloribus ratem aut omnimi, sitatur? Quiatem. Nam, omnis sum am facea corem alique molestrunt et eos evelece arcillit ut aut eos eos nus, sin conecerem erum fuga. Ri oditatquam, ad quibus unda veliamenimin cusam et facea ipsamus es exerum sitate dolores editium rerore eost, temped molorro ratiae volorro te reribus dolorer sperchicium faceata tiustia prat.

Itatur? Quiatae cullecum rem ent aut odis in re eossequodi nonsequ idebis ne sapicia is sinveli squiatum, core et que aut hariosam ex eat.

## Images

Pour ajouter des images, utilisez un point d’exclamation `!`, suivi du texte alternatif entre crochets `[]`, puis du chemin ou de l’URL de l’image entre parenthèses `()`.

### Syntaxe

```
![Description de l’image](../_images/image-01.jpeg)

![Description de l’image](https://image.example.com/image-01.webp)
```

### Rendu

![Description de l’image](https://image.radishzz.cc/picsmaller/03.webp)

## Citations (Blockquotes)

Pour créer des citations, ajoutez le symbole `>` suivi d’un espace avant le texte. Les citations peuvent contenir plusieurs paragraphes. Pour citer des sources, utilisez les balises `<cite>` ou `<footer>`, et pour les notes de bas de page la syntaxe `[^1]` ou `[^note]`.

### Citation avec plusieurs paragraphes

#### Syntaxe

```markdown
> Tiam, ad mint andaepu dandae nostion secatur sequo quae.
>
> **Note** que vous pouvez utiliser la _syntaxe Markdown_ à l’intérieur d’une citation.
```

#### Rendu

> Tiam, ad mint andaepu dandae nostion secatur sequo quae.
>
> **Note** que vous pouvez utiliser la *syntaxe Markdown* à l’intérieur d’une citation.

### Citation avec source

#### Syntaxe

```markdown
> Don't communicate by sharing memory, share memory by communicating.
>
> — <cite>Rob Pike[^1]</cite>

[^1]: La citation ci-dessus est extraite de la [conférence](https://www.youtube.com/watch?v=PAAkCSZUG1c) de Rob Pike lors du Gopherfest, le 18 novembre 2015.
```

#### Rendu

> Don't communicate by sharing memory, share memory by communicating.
>
> — <cite>Rob Pike[^1]</cite>

[^1]: La citation ci-dessus est extraite de la [conférence](https://www.youtube.com/watch?v=PAAkCSZUG1c) de Rob Pike lors du Gopherfest, le 18 novembre 2015.

## Tableaux

Pour ajouter des tableaux, utilisez trois tirets ou plus `---` pour créer l’en-tête de chaque colonne, et des barres verticales `|` pour séparer les colonnes.

### Syntaxe

```markdown
| Italique  | Gras     | Code   |
| --------- | -------- | ------ |
| _italique_ | **gras** | `code` |
| _italique_ | **gras** | `code` |
```

### Rendu

| Italique   | Gras     | Code   |
| ---------- | -------- | ------ |
| *italique* | **gras** | `code` |
| *italique* | **gras** | `code` |

## Blocs de code

Pour créer des blocs de code, entourez votre code de trois accents graves ` ``` `. Vous pouvez préciser le langage après les accents d’ouverture afin d’appliquer une coloration syntaxique appropriée, par exemple html, javascript, css, markdown, etc.

### Syntaxe

````
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Exemple de document HTML5</title>
  </head>
  <body>
    <p>Test</p>
  </body>
</html>
```
````

### Rendu

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Exemple de document HTML5</title>
  </head>
  <body>
    <p>Test</p>
  </body>
</html>
```

## Types de listes

### Liste ordonnée

#### Syntaxe

```markdown
1. Premier élément
2. Deuxième élément
3. Troisième élément
```

#### Rendu

1. Premier élément
2. Deuxième élément
3. Troisième élément

### Liste non ordonnée

#### Syntaxe

```markdown
- Élément de liste
- Élément de graphique
- Et un autre élément
```

#### Rendu

* Élément de liste
* Élément de graphique
* Et un autre élément

### Liste imbriquée

#### Syntaxe

```markdown
- Fruits
  - Pomme
  - Orange
  - Banane
- Produits laitiers
  - Lait
  - Fromage
```

#### Rendu

* Fruits

  * Pomme
  * Orange
  * Banane
* Produits laitiers

  * Lait
  * Fromage

## Autres éléments

Incluent `<sup>` pour l’exposant, `<sub>` pour l’indice, `<abbr>` pour les abréviations, `<del>` pour le texte barré, `<u>` pour le soulignement ondulé, `<kbd>` pour les entrées clavier, `<mark>` pour la mise en évidence, et `<hr>` pour les séparateurs horizontaux.

### Syntaxe

```markdown
H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

<abbr title="Graphics Interchange Format">GIF</abbr> est un format d’image bitmap.

Les bons rédacteurs vérifient toujours les fautes <u title="orthographe">d’ortografe</u>.

Appuyez sur <kbd>CTRL</kbd> + <kbd>ALT</kbd> + <kbd>Suppr</kbd> pour terminer la session.

Il n’y a <del>rien</del> ni bon ni mauvais code, mais l’exécuter le rend tel.

La plupart des <mark>salamandres</mark> sont nocturnes et chassent des insectes, des vers et d’autres petites créatures.

Utilisez trois tirets `---` ou la balise `<hr>` pour créer une règle horizontale comme ci-dessous.

---
```

### Rendu

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

<abbr title="Graphics Interchange Format">GIF</abbr> est un format d’image bitmap.

Les bons rédacteurs vérifient toujours les fautes <u title="orthographe">d’ortografe</u>.

Appuyez sur <kbd>CTRL</kbd> + <kbd>ALT</kbd> + <kbd>Suppr</kbd> pour terminer la session.

Il n’y a <del>rien</del> ni bon ni mauvais code, mais l’exécuter le rend tel.

La plupart des <mark>salamandres</mark> sont nocturnes et chassent des insectes, des vers et d’autres petites créatures.

Utilisez trois tirets `---` ou la balise `<hr>` pour créer une règle horizontale comme ci-dessous.

---
