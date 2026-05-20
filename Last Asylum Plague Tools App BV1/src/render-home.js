// Home-page rendering/navigation helpers.

    function showPage(id){
      document.getElementById("homePage").classList.toggle("hidden",id!=="homePage");
      document.getElementById("ravenPage").classList.toggle("hidden",id!=="ravenPage");
      window.scrollTo({top:0,behavior:"smooth"});
    }
