var obj_NgApp = angular.module('app_todo', ['ngRoute', 'ui.bootstrap']);

obj_NgApp.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
        when('/list', {
          templateUrl: 'list.html',
          controller: 'ctr_todo'
        }).
        when('/detail/:idx', {
          templateUrl: 'detail.html',
          controller: 'ctr_todoDtl'
        }).
        otherwise({
          redirectTo: '/list'
        });
}]);

obj_NgApp.factory("sharedDObj", function () {
    return {total_cnt: 0, curPage: 1, searchTag: '', completeBool: '', searchText: ''};
});

   

obj_NgApp.controller('ctr_todoDtl', ['$scope', '$routeParams', '$http', '$document', '$location', 'sharedDObj', function ($scope, $routeParams, $http, $document, $location, sharedDObj) {

    $scope.sharedDObj = sharedDObj;

    var baseUrl = '/todo';

    $( "#inp_date" ).datepicker({
      defaultDate: "",
      changeMonth: true,
      changeYear: true,
      numberOfMonths: 1,
      dateFormat    : "yy-mm-dd"
    });

    if($routeParams.idx == 'N') {
        $scope.sel_contents = '';
        $scope.sel_title = '';
        $scope.sel_tags = '';
        $scope.sel_id = '';
        $scope.sel_due_date = formattedDate(subtractDate(new Date(), 0));

        $('#summernote').summernote({
          height: 100,                 // set editor height
          minHeight: null,             // set minimum height of editor
          maxHeight: null,             // set maximum height of editor
          focus: true
        });

    } else {

        var ctrUrl = baseUrl + '/searchDetail';
        $scope.sel_id = $routeParams.idx;
        var dataObj = {};
        addDataObj(jQuery, dataObj, "sel_id", $scope.sel_id);
        $http.post(ctrUrl, dataObj).success(function (returnData) {
            $scope.sel_contents = returnData.detailObj[0].contents;
            $('#summernote').summernote('code', $scope.sel_contents);
            $scope.sel_title = returnData.detailObj[0].title;
            $scope.sel_tags = returnData.detailObj[0].tags;
            $scope.sel_id = returnData.detailObj[0]._id;
            $scope.sel_notice_bool = returnData.detailObj[0].notice_bool;
            $scope.sel_due_date = returnData.detailObj[0].due_date;

            if(returnData.detailObj[0].complete == true) {
                $scope.completeButtonBool = false;
            } else {
                $scope.completeButtonBool = true;
            }

            $('#summernote').summernote({
              height: 100,                 // set editor height
              minHeight: null,             // set minimum height of editor
              maxHeight: null,             // set maximum height of editor
              focus: true
            });
        }).error(function (data, status, headers, config) {
            alert('error: ' + status);
        });
    }

    function addDataObj(jQuery, dataObj, keyNm, keyVal) {
        eval("jQuery.extend(dataObj, {" + keyNm + " : keyVal})");
    }

    function formattedDate(date) {
        //ISO Date로 전환(달, 일자를 2자리 수로 고정하기 위해)
        var isoDate = date.toISOString();
        //정규 표현식으로 변환(MM/DD/YYYY)
        //result = isoDate.replace(/^(\d{4})\-(\d{2})\-(\d{2}).*$/, '$2/$3/$1');
        result = isoDate.replace(/^(\d{4})\-(\d{2})\-(\d{2}).*$/, '$1-$2-$3');
        return result;
    }

    function subtractDate(date, sub) {
        //sub 값이 있을 경우(빼기)
        if (sub != undefined) {
            date.setDate(date.getDate() - sub);
        }
        return date;
    }

    $scope.savePost = function () {
        var ctrUrl = baseUrl + '/savePost';
        var dataObj = $scope.returnSearchCriteria();

        $scope.sel_contents = $('#summernote').summernote('code');
        addDataObj(jQuery, dataObj, "sel_title", $scope.sel_title);
        addDataObj(jQuery, dataObj, "sel_contents", $scope.sel_contents);
        addDataObj(jQuery, dataObj, "sel_tags", $scope.sel_tags);
        addDataObj(jQuery, dataObj, "sel_id", $scope.sel_id);
        addDataObj(jQuery, dataObj, "sel_due_date", $scope.sel_due_date);
        addDataObj(jQuery, dataObj, "sel_notice_bool", $scope.sel_notice_bool);

        $http.post(ctrUrl, dataObj).success(function (returnData) {
            // $('#summernote').summernote('destroy');
            // $location.url('/list');
            $scope.cancleClickAtDetail();

        }).error(function (data, status, headers, config) {
            alert('error: ' + status);
        });
    }

    $scope.completeClick = function (sel_id) {
        var ctrUrl = baseUrl + '/complete';

        var dataObj = $scope.returnSearchCriteria();
        addDataObj(jQuery, dataObj, "sel_id", sel_id);

        $http.post(ctrUrl, dataObj).success(function (returnData) {
            $location.url('/list');
            // searchResultHandler(returnData);
        }).error(function (data, status, headers, config) {
            alert('error: ' + status);
        });

    }

    $scope.cancelCompletionClick = function (sel_id) {
        var ctrUrl = baseUrl + '/cancelComplete';

        var dataObj = $scope.returnSearchCriteria();
        addDataObj(jQuery, dataObj, "sel_id", sel_id);

        $http.post(ctrUrl, dataObj).success(function (returnData) {
            $location.url('/list');
            // searchResultHandler(returnData);
        }).error(function (data, status, headers, config) {
            alert('error: ' + status);
        });

    }

    $scope.cancleClickAtDetail = function () {
        $('#summernote').summernote('destroy');
        // sharedDObj.searchCriteria = $scope.returnSearchCriteria();
        $location.url('/list');

    }

    // function returnSearchCriteria() {
    //     var dataObj = {};
    //     return dataObj;
    // }

}]);

obj_NgApp.controller('ctr_todo', ['$scope', '$routeParams', '$http', '$document', '$location', 'sharedDObj', function ($scope, $routeParams, $http, $document, $location, sharedDObj) {

    $scope.sharedDObj = sharedDObj;

    var baseUrl = '/todo';

    // because the value of $scope will be gone while $route's transition, some of values should be located in the data object of the factory
    $scope.maxPaginationPerPage = 5;
    $scope.perPage = 5;

    // when user leaves this page
    $scope.$on('$locationChangeStart', function(event) {
        //
        // sharedDObj.searchCriteria = $scope.returnSearchCriteria();

    });

    // $scope.applySearchCriteria = function(dObj) {
    //     $scope.searchTag = dObj.searchTags;
    //     $scope.searchText = dObj.searchText;
    //     $scope.completeBool = dObj.completeBool;
    //     $scope.curPage = dObj.curPage;
    //
    //     // $scope.total_cnt = dObj.total_cnt;
    // }

    $document.ready(function () {

        // if($scope.sharedDObj.initBool == undefined) {
        //     $scope.sharedDObj.initBool = true;
        // }
        //
        // if($scope.sharedDObj.initBool) {
        //     $scope.sharedDObj.initBool = false;
        //     // $scope.sharedDObj = sharedDObj;
        //     $scope.sharedDObj.searchCriteria = $scope.returnSearchCriteria();
        //
        // } else {
        //     $scope.applySearchCriteria($scope.sharedDObj.searchCriteria);
        //
        // }
        $scope.searchClick();



        // if( $scope.sharedDObj.searchCriteria != undefined) {
        //     $scope.searchTag = $scope.sharedDObj.searchCriteria.searchTags;
        //     $scope.total_cnt = $scope.sharedDObj.searchCriteria.total_cnt;
        //     $scope.searchText = $scope.sharedDObj.searchCriteria.searchText;
        //     if(!($scope.sharedDObj.searchCriteria.completeBool == true || $scope.sharedDObj.searchCriteria.completeBool == false)) {
        //         $scope.completeBool = $scope.sharedDObj.searchCriteria.completeBool == 'y' ? true : false;
        //     } else {
        //         $scope.completeBool = $scope.sharedDObj.searchCriteria.completeBool;
        //     }
        //
        //     $scope.searchClick();
        // } else {
        //     $scope.sharedDObj.searchCriteria = {};
        //     $scope.completeBool = true;
        // }

        // $( "#inp_date" ).datepicker({
        //   defaultDate: "",
        //   changeMonth: true,
        //   changeYear: true,
        //   numberOfMonths: 1,
        //   dateFormat    : "yy-mm-dd"
        // });

    });

    function formattedDate(date) {

        //ISO Date로 전환(달, 일자를 2자리 수로 고정하기 위해)
        var isoDate = date.toISOString();

        //정규 표현식으로 변환(MM/DD/YYYY)
        //result = isoDate.replace(/^(\d{4})\-(\d{2})\-(\d{2}).*$/, '$2/$3/$1');
        result = isoDate.replace(/^(\d{4})\-(\d{2})\-(\d{2}).*$/, '$1-$2-$3');
        return result;
    }

    function subtractDate(date, sub) {
        //sub 값이 있을 경우(빼기)
        if (sub != undefined) {
            date.setDate(date.getDate() - sub);
        }
        return date;
    }

    $scope.searchClick = function (searchTag) {

        // if($scope.sharedDObj.searchCriteria == undefined) {
        //   $scope.sharedDObj.searchCriteria = {};
        // }

        // if($scope.searchText != undefined)
        //     $scope.sharedDObj.searchCriteria.searchText = $scope.searchText;
        // $scope.cancleClick();
        if(searchTag == undefined) {
            if($scope.sharedDObj.searchTag == undefined || $scope.sharedDObj.searchTag == '') {
                $scope.sharedDObj.searchTag = 'All';
                $scope.sharedDObj.curPage = 1;
            }
            // if($scope.sharedDObj.searchCriteria.searchTags != undefined) {
            //     $scope.searchTag = $scope.sharedDObj.searchCriteria.searchTags;
            // }
            // // $scope.sharedDObj.searchCriteria.searchTags = 'All';
        } else {
            $scope.sharedDObj.searchTag = searchTag;
            $scope.sharedDObj.curPage = 1;
            // $scope.sharedDObj.searchCriteria.searchTags = searchTag;
        }

        $scope.searchHanlder();
    }

    $scope.pageChanged = function() {
        $scope.searchHanlder();
    }



    $scope.returnSearchCriteria = function() {
        var dataObj = {};

        // if($scope.searchText == undefined && $scope.sharedDObj.searchCriteria.searchText != undefined)
        //     $scope.searchText = $scope.sharedDObj.searchCriteria.searchText;
        //
        addDataObj(jQuery, dataObj, "searchText", $scope.sharedDObj.searchText);
        // if($scope.searchTag != 'All') {
        addDataObj(jQuery, dataObj, "searchTags", $scope.sharedDObj.searchTag);
        // }
        addDataObj(jQuery, dataObj, "completeBool", !$scope.sharedDObj.completeBool);
        // $scope.sharedDObj.searchCriteria.completeBool = $scope.completeBool;
        addDataObj(jQuery, dataObj, "curPage", $scope.sharedDObj.curPage);
        return dataObj;
    }

    function searchResultHandler(returnData) {
        $scope.test_cols = returnData.test_cols;
        $scope.keywords = returnData.keywords;
        $scope.sharedDObj.total_cnt = returnData.total_cnt;

        // $scope.sharedDObj.searchCriteria.total_cnt = $scope.total_cnt;
    }

    $scope.searchHanlder = function () {
        var ctrUrl = baseUrl + '/search';

        $http.post(ctrUrl, $scope.returnSearchCriteria()).success(function (returnData) {
            searchResultHandler(returnData);

        }).error(function (data, status, headers, config) {
            alert('error: ' + status);
        });
    }

    // $scope.prevClick = function() {
    //     // $scope.cancleClick();
    //     $scope.curPage = $scope.curPage - 1;
    //     searchHanlder();
    // }
    //
    // $scope.nextClick = function () {
    //     // $scope.cancleClick();
    //     if ($scope.test_cols.length == 0) {
    //         alert('There is no more page.')
    //     } else {
    //         $scope.curPage = $scope.curPage + 1;
    //         searchHanlder();
    //     }
    // }

    $scope.newPostClick = function () {
        $location.path('/detail/' + 'N');
    }

    $scope.rowClick = function (idx) {
        // if ($scope.selInx == idx) {
        //     $location.url('/list');
        //     $('#summernote').summernote('destroy');
        // } else {
            $scope.sharedDObj = $scope.returnSearchCriteria();
            $location.path('/detail/' + $scope.test_cols[idx]._id);
        // }
    }

    function addDataObj(jQuery, dataObj, keyNm, keyVal) {
        eval("jQuery.extend(dataObj, {" + keyNm + " : keyVal})");
    }

}]);
