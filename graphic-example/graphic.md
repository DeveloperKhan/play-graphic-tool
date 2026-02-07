## Structure

Graphic consists of top left area including title and usage:

Each usage can be considered a usage component:
- The pokemon image
- #C1D4FF color background
- Usage percent (of total 16)
- If the pokemon is 100% shadow, then add shadow logo, else add a seperate shadow percent (count of how many of the pokemon are shadow / count of how many of the pokemon)
  - Example: Altaria usage is split up into 2 numbers while Scizor, Annihilape, and Dusknoir is a single shadow number

The graphic's remaining space is used for 3 columns of player information

Column 1: Winners brackets (4 player elements)
Column 2: Winners brackets (4 player elements)
Column 3: Losers brackets (8 player elements)

Each player element is 2 rows:
  - Flag and name
  - 6 Pokemon (pokemon image and potentially shadow icon)


There is a footer at the bottom of the page with a single row:
  - Dracoviz logo
  - Text saying: "Pokémon GO data insights and infographics. Find more at:"
  - Social handles
    - Website: dracoviz.com
    - X / Twitter: dracoviz
    - Instagram: _dracoviz


## Images

Background image from ../public/assets/graphic/background.png)
All pokemon icons can be fetched from `getPokemonSpriteBySid`
All flags from `import * as flags from "country-flag-icons/react/3x2";`
Dracoviz logo from ../public/assets/graphic/dracoviz-full-logo.png
Regional championship logo ..public/assets/graphic/regional.png

## Fonts
All components: ../public/assets/fonts/Urbane-DemiBold.ttf
Footer: ../public/assets/fonts/proximanova_regular.otf