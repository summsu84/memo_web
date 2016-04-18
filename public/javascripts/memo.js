var obj_NgApp = angular.module('app_memo', []);

obj_NgApp.controller('ctr_memo', function ($scope, $http, $document, $window) {

    var baseUrl = '/memo';

    $scope.curPage = 1;
    $scope.perPage = 5;
    $scope.completeBool = true;

    $scope.selectedBadge = '';

    $scope.editViewBool = false;

    $document.ready(function () {

        $( "#inp_date" ).datepicker({
          defaultDate: "",
          changeMonth: true,
          changeYear: true,
          numberOfMonths: 1,
          dateFormat    : "yy-mm-dd"
        });

        $scope.searchClick();

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

        $scope.selectedBadge = searchTag;

        $scope.cancleClick();
        if(searchTag == undefined) {
            $scope.searchTag = 'All';
        } else {
            $scope.searchTag = searchTag;
        }
        $scope.curPage = 1;
        searchHanlder();
    }

    $scope.completeClick = function () {
        var ctrUrl = baseUrl + '/complete';

        var dataObj = returnSearchCriteria();
        addDataObj(jQuery, dataObj, "sel_id", $scope.sel_id);

        $http.post(ctrUrl, dataObj).success(function (returnData) {
            $scope.cancleClick();
            searchResultHandler(returnData);
        }).error(function (data, status, headers, config) {
            alert('error: ' + status);
        });

    }

    $scope.cancelCompletionClick = function () {
        var ctrUrl = baseUrl + '/cancelComplete';

        var dataObj = returnSearchCriteria();
        addDataObj(jQuery, dataObj, "sel_id", $scope.sel_id);

        $http.post(ctrUrl, dataObj).success(function (returnData) {
            $scope.cancleClick();
            searchResultHandler(returnData);
        }).error(function (data, status, headers, config) {
            alert('error: ' + status);
        });

    }

    $scope.savePost = function () {
        var ctrUrl = baseUrl + '/savePost';
        var dataObj = returnSearchCriteria();

        $scope.sel_contents = $('#summernote').summernote('code');
        addDataObj(jQuery, dataObj, "sel_title", $scope.sel_title);
        addDataObj(jQuery, dataObj, "sel_contents", $scope.sel_contents);
        addDataObj(jQuery, dataObj, "sel_tags", $scope.sel_tags);
        addDataObj(jQuery, dataObj, "sel_id", $scope.sel_id);
        addDataObj(jQuery, dataObj, "sel_due_date", $scope.sel_due_date);
        addDataObj(jQuery, dataObj, "sel_notice_bool", $scope.sel_notice_bool);

        $http.post(ctrUrl, dataObj).success(function (returnData) {
            $scope.cancleClick();
            searchResultHandler(returnData);
        }).error(function (data, status, headers, config) {
            alert('error: ' + status);
        });

    }

    function returnSearchCriteria() {
        var dataObj = {};
        addDataObj(jQuery, dataObj, "searchText", $scope.searchText);
        if($scope.searchTag != 'All') {
            addDataObj(jQuery, dataObj, "searchTags", $scope.searchTag);
        }
        addDataObj(jQuery, dataObj, "completeYn", $scope.completeBool == true ? 'n' : 'y');
        addDataObj(jQuery, dataObj, "pageNo", $scope.curPage);
        return dataObj;
    }

    function searchResultHandler(returnData) {
        $scope.test_cols = returnData.test_cols;
        $scope.keywords = returnData.keywords;
    }

    function searchHanlder() {
        var ctrUrl = baseUrl + '/search';

        $http.post(ctrUrl, returnSearchCriteria()).success(function (returnData) {
            searchResultHandler(returnData);

        }).error(function (data, status, headers, config) {
            alert('error: ' + status);
        });
    }

    $scope.prevClick = function() {
        $scope.cancleClick();
        $scope.curPage = $scope.curPage - 1;
        searchHanlder();
    }

    $scope.nextClick = function () {
        $scope.cancleClick();
        if ($scope.test_cols.length == 0) {
            alert('There is no more page.')
        } else {
            $scope.curPage = $scope.curPage + 1;
            searchHanlder();
        }
    }

    $scope.newPostClick = function () {
        $scope.editViewBool = true;
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
    }

    $scope.rowClick = function (idx) {
        if ($scope.editViewBool == true && $scope.selInx == idx) {
            $scope.editViewBool = false;
            $('#summernote').summernote('destroy');
        } else {
            $scope.editViewBool = true;
            $scope.selInx = idx;
            $scope.sel_contents = $scope.test_cols[idx].contents;
            $('#summernote').summernote('code', $scope.sel_contents);
            $scope.sel_title = $scope.test_cols[idx].title;
            $scope.sel_tags = $scope.test_cols[idx].tags;
            $scope.sel_id = $scope.test_cols[idx]._id;
            $scope.sel_notice_bool = $scope.test_cols[idx].notice_bool;
            $scope.sel_due_date = $scope.test_cols[idx].due_date;

            if($scope.test_cols[idx].complete == 'y') {
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
        }
    }

    $scope.cancleClick = function () {
        $scope.editViewBool = false;
        $('#summernote').summernote('destroy');
    }

    function addDataObj(jQuery, dataObj, keyNm, keyVal) {
        eval("jQuery.extend(dataObj, {" + keyNm + " : keyVal})");
    }

});
