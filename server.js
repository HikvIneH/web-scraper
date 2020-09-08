const cheerio = require('cheerio')
const axios = require('axios');
const { resolve } = require('url')
const fs = require('fs');
const pMap = require('p-map')

const baseUrl = 'https://cermati.com'

exports.main = async () => {
  const html = await axios.get(baseUrl + '/artikel');
  const $ = cheerio.load(html.data);

  const repos = $('div.article-list-item').get().map((i) => {
    try{
      const $i = $(i)
      const $link = $i.find('a')
      let url = resolve(baseUrl, $link.attr('href'))
      return {
          url
      }
    } catch (err) {
        console.error('parse error', err)
    }
  }).filter(Boolean)

  return (await pMap(repos, processDetailPage, {
    concurency: 3
    })
  ).filter(Boolean)

  async function processDetailPage (repo) {
    try {
      const html = await axios.get(repo.url)
      const $ = cheerio.load(html.data)
      
      let postTitle = $('h1.post-title').text()
      let author = $('span.post-author span.author-name').text().trim()
      let postingDate = $('span.post-date').text().trim()

      let url = ''
      let title = ''
      const tempArticles = []
      const relatedArticles = $('h4.panel-header:contains("Artikel Terkait")').next('.panel-items-list').map((i, li) => {
        const $li = $(li)

        $li.find('a').each((i, elem) =>{
          $link = $(elem).attr('href')
          url = resolve(baseUrl, $link)
          title = $(elem).find('h5').text()
          tempArticles.push({
            url,
            title
          })

        }).get()

        return tempArticles
      }).get()

      return {
        ...repo,
        postTitle,
        author,
        postingDate,
        relatedArticles
      }
    } catch (err) {
      console.error(err.message)
    } 
  }
}

if (!module.parent) {
  exports.main().then((repos) => {
    const articles = {
      articles: repos
    }      

    let data = JSON.stringify(articles, null, 2);
    
    fs.writeFileSync('output.json', data);
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
}