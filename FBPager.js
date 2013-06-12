function FBPager(query,limit,cbActOnData,cbActOnObjectDone) {
    this.query = query;
    this.limit = limit;
    this.actOnData = cbActOnData;
    this.actOnObjectDone = cbActOnObjectDone;
    this.listeners = new Array();
}

FBPager.prototype = {
    offset : 0,
    limit : 0,
    
    run : function() {
        FBPager.openedCallback++;
        this.getNextData();
    },
    
    getNextData : function() {
        var apiQuery = this.query + '&offset=' + this.offset + '&limit=' + this.limit;
        FB.api(apiQuery,this.genOnData());
    },
    
    genOnData : function() {
        return this.genOnDataAux(this);
    },
    
    genOnDataAux : function(obj) {
        return function(response) {
            if (response.error) {
                DebugPrint('<FBPager::onData> Error - ' + response.error.message);
                return
            }
            if (obj.limit == 0) {                
                // If we want to query a single object
                FBPager.openedCallback--;
                obj.actOnData(response);                
                obj.checkIfDone();
                return;
            }           
            
            if (response.data.length == 0) {            
                FBPager.openedCallback--;
                if (obj.actOnObjectDone) {
                    obj.actOnObjectDone();
                }
                obj.checkIfDone();
                return;
            }        
            for (obj_idx in response.data) {
                obj.actOnData(response.data[obj_idx]);
            }
            obj.offset += obj.limit;
            obj.getNextData();
        }
    },
    
    checkIfDone : function () {
        if (FBPager.openedCallback != 0) {
            return;
        }
        if (FBPager.actOnDone) {
            FBPager.actOnDone();
        }
    },
}

FBPager.reset = function(cbActOnDone) {
    FBPager.openedCallback = 0;
    FBPager.actOnDone = cbActOnDone;
}
