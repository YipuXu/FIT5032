import { ref, computed, onMounted, onUnmounted } from 'vue'
import { db } from '../firebase/index.js'
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore'

function useSuburbs() {
  const suburbs = ref([])
  let unsubscribe = null

  // 默认的墨尔本街区列表
  const defaultSuburbs = [
    'Abbotsford',
    'Aberfeldie',
    'Airport West',
    'Albert Park',
    'Alphington',
    'Altona',
    'Altona Meadows',
    'Armadale',
    'Ascot Vale',
    'Ashburton',
    'Ashwood',
    'Aspendale',
    'Auburn',
    'Avondale Heights',
    'Balaclava',
    'Balwyn',
    'Balwyn North',
    'Bangholme',
    'Bayswater',
    'Beaumaris',
    'Bellfield',
    'Bentleigh',
    'Bentleigh East',
    'Blackburn',
    'Blackburn North',
    'Blackburn South',
    'Box Hill',
    'Braybrook',
    'Brighton',
    'Brighton East',
    'Broadmeadows',
    'Brunswick',
    'Brunswick East',
    'Brunswick West',
    'Bundoora',
    'Burwood',
    'Camberwell',
    'Campbellfield',
    'Canterbury',
    'Carlton',
    'Carlton North',
    'Carnegie',
    'Caroline Springs',
    'Caulfield',
    'Chadstone',
    'Cheltenham',
    'Coburg',
    'Coburg North',
    'Collingwood',
    'Cremorne',
    'Croydon',
    'Dandenong',
    'Doncaster',
    'Doncaster East',
    'Doreen',
    'Elsternwick',
    'Elwood',
    'Epping',
    'Essendon',
    'Fairfield',
    'Fawkner',
    'Ferntree Gully',
    'Fitzroy',
    'Fitzroy North',
    'Footscray',
    'Forest Hill',
    'Frankston',
    'Gardenvale',
    'Glen Iris',
    'Glen Waverley',
    'Greensborough',
    'Hampton',
    'Hawthorn',
    'Hawthorn East',
    'Heidelberg',
    'Heatherton',
    'Hoppers Crossing',
    'Ivanhoe',
    'Keysborough',
    'Kew',
    'Kew East',
    'Kilsyth',
    'Laverton',
    'Lilydale',
    'Malvern',
    'Malvern East',
    'Maribyrnong',
    'Mordialloc',
    'Mount Waverley',
    'Mulgrave',
    'Newport',
    'Northcote',
    'Nunawading',
    'Oakleigh',
    'Oakleigh East',
    'Parkville',
    'Pascoe Vale',
    'Port Melbourne',
    'Preston',
    'Reservoir',
    'Richmond',
    'Ripponlea',
    'Rowville',
    'Sandringham',
    'Scoresby',
    'Southbank',
    'South Yarra',
    'Springvale',
    'St Kilda',
    'St Kilda East',
    'Sunbury',
    'Sunshine',
    'Surrey Hills',
    'Templestowe',
    'Thomastown',
    'Toorak',
    'Tottenham',
    'Vermont',
    'Warrandyte',
    'Watsonia',
    'Werribee',
    'Wheelers Hill',
    'Williamstown',
    'Yarraville',
    'Other',
  ]

  function start() {
    try {
      const col = collection(db, 'settings')
      unsubscribe = onSnapshot(
        col,
        (snap) => {
          const suburbsDoc = snap.docs.find((doc) => doc.id === 'suburbs')
          if (suburbsDoc && suburbsDoc.exists()) {
            const data = suburbsDoc.data()
            suburbs.value = data.list || defaultSuburbs
          } else {
            // 如果 Firestore 中没有 suburbs 文档，则创建默认的
            initializeDefaultSuburbs()
          }
        },
        (error) => {
          console.error('Failed to subscribe to suburbs:', error)
          suburbs.value = defaultSuburbs
        },
      )
    } catch (e) {
      console.error('Failed to subscribe to suburbs:', e)
      suburbs.value = defaultSuburbs
    }
  }

  async function initializeDefaultSuburbs() {
    try {
      await setDoc(doc(db, 'settings', 'suburbs'), {
        list: defaultSuburbs,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    } catch (e) {
      console.error('Failed to initialize default suburbs:', e)
    }
  }

  // 按字母顺序排序的街区列表
  const sortedSuburbs = computed(() => {
    return suburbs.value.slice().sort((a, b) => a.localeCompare(b))
  })

  onMounted(start)
  onUnmounted(() => {
    try {
      if (unsubscribe) unsubscribe()
    } catch (e) {
      console.warn('Error unsubscribing from suburbs:', e)
    }
  })

  return { suburbs, sortedSuburbs }
}

export { useSuburbs }
