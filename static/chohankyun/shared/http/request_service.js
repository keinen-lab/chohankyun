'use strict';
//$cookies 관련 api 는  최신 api 로 수정했음
var chohankyun = angular.module('chohankyun');

chohankyun.service('request_service', function ($q, $http, $cookies, $rootScope) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var service = {
        /* START CUSTOMIZATION HERE */
        // Change this to point to your Django REST Auth API
        // e.g. /api/rest-auth  (DO NOT INCLUDE ENDING SLASH)
        'API_URL': '',
        // Set use_session to true to use Django sessions to store security token.
        // Set use_session to false to store the security token locally and transmit it as a custom header.
        'use_session': true,
        /* END OF CUSTOMIZATION */
        'authenticated': null,
        'authPromise': null,
        'request': function (args) {
            $rootScope.$broadcast("loading", true);
            // Let's retrieve the token from the cookie, if available
            if ($cookies.token) {
                $http.defaults.headers.common.Authorization = 'Token ' + $cookies.get('token')
            }
            // Continue
            params = args.params || {}
            args = args || {};
            var deferred = $q.defer(),
                url = this.API_URL + args.url,
                method = args.method || "GET",
                params = params,
                data = args.data || {};
            // Fire the request, as configured.
            $http({
                url: url,
                withCredentials: this.use_session,
                method: method.toUpperCase(),
                headers: {'X-CSRFToken': $cookies.get('csrftoken')},
                params: params,
                data: data
            })
                .success(angular.bind(this, function (data, status, headers, config) {
                    $rootScope.$broadcast("loading", false);
                    deferred.resolve(data, url);
                }))
                .error(angular.bind(this, function (data, status, headers, config) {
                    // console.log("url: " + url);
                    // console.log("data : " + data);
                    // console.log("status : " + status);
                    // Set request status
                    $rootScope.$broadcast("loading", false);
                    if (status == 500) {
                        data = "Internal server error.";
                        $rootScope.$broadcast("error", data);
                        return;
                    } else if (status == 0) {
                        if (data == "") {
                            data = "Could not connect to server.";
                        }
                        // or if the data is null, then there was a timeout.
                        if (data == null) {
                            data = "Could not connect to server cause by time out.";
                        }
                        $rootScope.$broadcast("error", data);
                        return;
                    } else if (status == -1) {
                        data ="Could not connect to server.";
                        $rootScope.$broadcast("error", data);
                        return;
                    }

                    if(data) {
                        data.status = status;
                    }
                    deferred.reject(data, status, headers, config);
                }));
            return deferred.promise;
        },
        'authentication_status': function (restrict, force) {
            // Set restrict to true to reject the promise if not logged in
            // Set to false or omit to resolve when status is known
            // Set force to true to ignore stored value and query API
            restrict = restrict || false;
            force = force || false;
            if (this.authPromise == null || force) {
                this.authPromise = this.request({
                    'method': "GET",
                    'url': "rest-auth/user/"
                })
            }
            var da = this;
            var getAuthStatus = $q.defer();
            if (this.authenticated != null && !force) {
                // We have a stored value which means we can pass it back right away.
                if (this.authenticated == false && restrict) {
                    getAuthStatus.reject("User is not logged in.");
                } else {
                    getAuthStatus.resolve($rootScope.data);
                }
            } else {
                // There isn't a stored value, or we're forcing a request back to
                // the API to get the authentication status.
                this.authPromise.then(function (data) {
                    da.authenticated = true;
                    getAuthStatus.resolve(data);
                }, function (data) {
                    da.authenticated = false;
                    if (restrict) {
                        getAuthStatus.reject("User is not logged in.");
                    } else {
                        getAuthStatus.resolve(data);
                    }
                });
            }
            return getAuthStatus.promise;
        },
        'initialize': function (url, sessions) {
            this.API_URL = url;
            this.use_session = sessions;
            return this.authentication_status();
        }

    }
    return service;
});
