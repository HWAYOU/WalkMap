const searchBox = document.querySelector(".searchBox");
const inputBox = document.querySelector(".inputBox");
const form = document.querySelector("form");
const searchBtn = document.querySelector(".searchBtn");
const infoBox = document.querySelector("#infoBox");

//좌표 변환 세팅
//2097 : 변환 전 좌표계 / 4326 : 변환 후 좌표계
Proj4js.defs["EPSG:2097"] =
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43";
Proj4js.defs["EPSG:4326"] = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
var s_srs = new Proj4js.Proj("EPSG:2097");
var t_srs = new Proj4js.Proj("EPSG:4326");

//산책로 모든 정보를 저장하는 배열
let allWalkList = [];

//allWalkList에서 courseName 중복 항목 제거된(코스 당 좌표 하나만 표시된다) 배열
let walkList;

//산책로 위치정보만 저장하는 positions 배열
var positions = [];

//산책로 데이터 연결
fetch(
  "http://openAPI.seoul.go.kr:8088/4e524d665a6b68793130325362614c56/xml/SeoulGilWalkCourse/1/1000"
)
  .then((response) => response.text())
  .then((xml) => {
    //xml형태의 문자열을 DOM으로 변환하여 data에 저장
    let data = new DOMParser().parseFromString(xml, "text/xml");
    console.log(data);
    //산책로 정보가 들어있는 <row>를 모두 찾아 변수 rows에 저장
    const rows = data.querySelectorAll("row");

    //rows의 정보를 walkList 배열에 저장하기위한 반복문
    rows.forEach((item) => {
      const courseName = item.querySelector("COURSE_NAME").innerHTML;
      const areaGu = item.querySelector("AREA_GU").innerHTML;
      const distance = item.querySelector("DISTANCE").innerHTML;
      const leadTime = item.querySelector("LEAD_TIME").innerHTML;
      const courseLevel = item.querySelector("COURSE_LEVEL").innerHTML;

      const content = item.querySelector("CONTENT").innerHTML;
      const detailCourse = item.querySelector("DETAIL_COURSE").innerHTML;

      const relateSubway = item.querySelector("RELATE_SUBWAY").innerHTML;
      const trafficInfo = item.querySelector("TRAFFIC_INFO").innerHTML;

      const x = item.querySelector("X").innerHTML;
      const y = item.querySelector("Y").innerHTML;

      //산책로 정보들로 walkInfo에 객체로 만들기
      walkInfo = {
        courseName: courseName,
        areaGu: areaGu,
        distance: distance,
        leadTime: leadTime,
        courseLevel: courseLevel,
        content: content,
        detailCourse: detailCourse,
        relateSubway: relateSubway,
        trafficInfo: trafficInfo,
        x: x,
        y: y,
      };

      //walkInfo를 allWalkList 배열에 추가시킨다
      allWalkList.push(walkInfo);
    });

    //walkList : courseName 중복 항목 제거된(코스 당 좌표 하나만 표시된다) 배열
    walkList = allWalkList.reduce(function (acc, current) {
      if (
        acc.findIndex(({ courseName }) => courseName === current.courseName) ===
        -1
      ) {
        acc.push(current);
      }
      return acc;
    }, []);

    //walkList 배열 안의 coursName과 input이 같은지 검증하는 함수
    //(입력한 input 값으로 데이터 출력)
    checkInput(walkList);

    // console.log(walkList);
    //walkList에 저장된 정보들을 position 배열에 추가한다.
    walkList.forEach((info) => {
      //1. 좌표변환(TM -> WGS84)
      var x = info.x; //walkList의 x
      var y = info.y; //walkList의 y

      var pt = new Proj4js.Point(x, y); //포인트 생성

      var result = Proj4js.transform(s_srs, t_srs, pt); //좌표계 변경

      // console.log(result); //경도, 위도
      var lat = result.y; //위도 경도  순서가 바뀌어서 출력된다.
      var lng = result.x; //위도 경도  순서가 바뀌어서 출력된다.

      //2. 변환된 좌표를 position에 추가
      positions.push({
        latlng: new kakao.maps.LatLng(lat, lng), //위도 경도
        content: `<div>${info.courseName}</div>`, //산책로이름
      });
    });

    //지도 출력 함수 호출
    showMap(positions);
  });

//지도 출력 및 마크 생성, 클릭 이벤트 함수
function showMap(positions) {
  var mapContainer = document.getElementById("map"), // 지도를 표시할 div
    mapOption = {
      center: new kakao.maps.LatLng(37.5666805, 126.9784147), // 지도의 중심좌표
      level: 6, // 지도의 확대 레벨
      marker: positions,
    };

  var map = new kakao.maps.Map(mapContainer, mapOption); // 지도를 생성합니다

  //마커 이미지
  var imageSrc =
    "https://cdn.pixabay.com/photo/2014/04/03/10/03/google-309739_960_720.png";
  // 이미지의 이미지 크기
  var imageSize = new kakao.maps.Size(23, 35);
  // 마커 이미지를 생성합니다
  var markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize);

  //마커생성
  for (var i = 0; i < positions.length; i++) {
    const marker = new kakao.maps.Marker({
      map: map, // 마커를 표시할 지도
      position: positions[i].latlng, // 마커의 위치
      image: markerImage, // 마커 이미지
      // title: positions[i].content,
    });

    //인포윈도우 : 마커 마우스오버 시 나타나는 창
    var infowindow = new kakao.maps.InfoWindow({
      content: positions[i].content,
    }); // 인포윈도우에 표시할 내용(content = courseName)

    // 마커에 mouseover 이벤트와 mouseout 이벤트를 등록합니다
    // 이벤트 리스너로는 클로저를 만들어 등록합니다
    // for문에서 클로저를 만들어 주지 않으면 마지막 마커에만 이벤트가 등록됩니다
    kakao.maps.event.addListener(
      marker,
      "mouseover",
      makeOverListener(map, marker, infowindow)
    );

    kakao.maps.event.addListener(
      marker,
      "mouseout",
      makeOutListener(infowindow)
    );

    // 인포윈도우를 표시하는 클로저를 만드는 함수입니다
    function makeOverListener(map, marker, infowindow) {
      return function () {
        infowindow.open(map, marker);
      };
    }

    // 인포윈도우를 닫는 클로저를 만드는 함수입니다
    function makeOutListener(infowindow) {
      return function () {
        infowindow.close();
      };
    }
  }
}

//입력한 input 값과 courseName을 비교하여 데이터 출력하는 함수
function checkInput(obj) {
  console.log(obj); // 100개 데이터

  //form 이벤트 설정
  form.addEventListener("submit", (event) => {
    // 1. submit 이벤트로 인해서 발생하는 페이지 새로고침 방지
    // (button을 누르면 무조건 submit발생)
    event.preventDefault();

    // (inputBox에서 받는 값을 변수로 정의)
    let userInput = inputBox.value;
    console.log("입력된값: " + userInput);
    // 2. obj(=walkList)를 반복문을 돌린다
    // userInput과 같은 courseName이 있다면 infoBox에 결과값을 출력해라
    walkList.forEach((item) => {
      if (userInput === item.courseName) {
        infoBox.innerHTML = `<div>
        <p class="courseName">${item.courseName}</p>
        <table>
        <tr>
        <td>위치<br>${item.areaGu}</td>
        <td>거리<br>${item.distance}</td>
        <td>소요시간<br>${item.leadTime}</td>
        </tr>
        </table>
        <p class="level">코스레벨 : 
        <span class="courseLevel">${item.courseLevel}</span>
        ${levelStar(item)}</p>
        <p class="detailCourse">${item.detailCourse}</p>
        <p class="relateSubway">🚃 ${item.relateSubway}</p>
        <p class="trafficInfo">${item.trafficInfo}</p>

        <form action="https://search.naver.com/search.naver" method="get" >
          <input type="text" name="query" value=${
            item.courseName
          } style="display: none;"></input>
          <button  class="naverBtn">NAVER 검색 결과</button>
        </form>
        </div>
        <br>`;
        //네이버 검색결과
        //input을 만들고 value에 결과값으로 출력된 item.courseName를 넣고 input창은 display : none으로 해준다
      }
    });
  });
}

//코스레벨 아이콘 함수
function levelStar(item) {
  console.log(item.courseLevel);
  switch (item.courseLevel) {
    case "1":
      return "⭐";
      break;
    case "2":
      return "⭐⭐";
      break;
    case "3":
      return "⭐⭐⭐";
      break;
    case "4":
      return "⭐⭐⭐⭐";
      break;
    case "5":
      return "⭐⭐⭐⭐⭐";
      break;
  }
}
