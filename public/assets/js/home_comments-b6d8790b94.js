{let e=function(){let e=$("#new-comment-form");e.submit((function(o){o.preventDefault(),$.ajax({type:"POST",url:"/comment/create",data:e.serialize(),success:function(e){console.log("To send: ",e.data);let o=n(e.data.comment);new ToggleLike($(" .toggle-like-button",o)),new Noty({theme:"relax",text:"Comment published!",type:"success",layout:"topRight",timeout:1e3}).show(),$("#comment-container").prepend(o),t($(".comment-delete",o))},error:function(e){console.log("Err: ",e.responseText)}})}))},n=function(e){return`<div id="comment-${e._id}" class="comment-item">\n                <div class="comment-content">\n                    ${e.user.name}\n                    <br>\n                    <small> ${e.content} </small>\n\n                    <div class='item-buttons'>\n                        \n                        <div class="item-like">\n                            <a class="toggle-like-button" href='/likes/toggle/?id=${e._id}&type=Comment' data-likes="${e.likes.length}">\n                                0 Likes\n                            </a>\n                        </div>\n                        \n                        <a class="comment-delete" href="comment/destroy/${e._id}">Delete</a>\n                                \n                    </div>\n                </div>\n            </div>`},t=function(e){console.log($(e).prop("href")),console.log(e),$(".comment-delete").click((function(n){console.log("clicked"),n.preventDefault(),$.ajax({type:"get",url:$(e).prop("href"),success:function(e){$("#comment-"+e.data.comment_id).remove()},error:function(e){console.log(e.responseText)}})}))};e()}