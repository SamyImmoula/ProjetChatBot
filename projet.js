require('dotenv').config();//inclure dotenv
var builder = require('botbuilder');//inclure botbuilder
var restify = require('restify');//inclure restify
var dateFormat = require('dateformat');

const SpaceXAPI = require('SpaceX-API-Wrapper');

let SpaceX = new SpaceXAPI();



var server = restify.createServer();//créer serveur

server.listen(process.env.PORT || 3978, function () { //connexion au serveur
   console.log("Serveur en écoute");
});

//Create chat connector for communicating with the Bot Framwork Service
var connector = new builder.ChatConnector({//Chatconnector-> sert à Connecter a UniversalBot
   appId: process.env.MICROSOFT_APP_ID,//definir l'ID
   appPassword: process.env.MICROSOFT_APP_PASSWORD//definir le mot de pass
});

//listen for messages from users
server.post('/api/messages', connector.listen());
var inMemoryStorage = new builder.MemoryBotStorage(); //implémentation Par défaut du stockage des données 
var bot = new builder.UniversalBot(connector, [
    function (session) {
        //Lancement du premier dialogue 'greetings'
        session.send(`Hello, je suis le chatbot spaceX :)`);
        session.beginDialog('menu', session.userData.profile);
    }
]).set('storage', inMemoryStorage);



var menuItems = { // lister les différentes  options
   "Dernier lancement": {
       item: "option1"
   },
   "toutes les fusées lancés": {
       item: "option2"
   },
   "Informations sur space x": {
       item: "option3"
   },
   "information fusée": {
    item: "option4"
   },
   "Plateforme de lancement": {
    item: "option5"
    },
};

bot.dialog('menu', [
   // Step 1
   function (session) {
       builder.Prompts.choice(session,//demande à l'utilisateur de choisir parmis la liste
           "Quelles informations voulez-vous ?",
           menuItems,
           {listStyle: 3 }) //3-> pour ranger sous forme de boutons
   },
   //Step 2
   function(session, results){
   var choice = results.response.entity;//recupere la réponse
   session.beginDialog(menuItems[choice].item);// ouvre un nouveau dialogue
   }
]);

function sleep(seconds){
    var waitUntil = new Date().getTime() + seconds*1000;
    while(new Date().getTime() < waitUntil) true;
}

bot.dialog('option1', [
    function (session) {
        session.sendTyping();
        SpaceX.getLatestLaunch(function (err, launch) {
            var adaptiveCardMessage = new builder.Message(session)
                .addAttachment({
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        type: "AdaptiveCard",
                        body: buildLatestLaunchBody(launch), 
                        actions: buildLatestLaunchActions(launch)
                    }
                });
            session.send(adaptiveCardMessage);
            sleep(process.env.TIMEOUT);
            session.beginDialog('menu', session.userData.profile);
        });
    },
 ]);

function buildLatestLaunchBody(launch) {
    var adaptiveCardMessage = [
                    {
                        "type": "Container",
                        "items": [
                            {
                                "type": "ColumnSet",
                                "columns": [
                                    {
                                      
                                            "type": "Column",
                                            "width": "auto",
                                            "items": [
                                                {
                                                "type": "Image",
                                                "url": launch.links.mission_patch_small,
                                                "size": "small",
                                                "style": "person"
                                            }
                                        ]
                                    },
                                    {
                                            "type": "Column",
                                            "width": "stretch",
                                            "items": [
                                            {
                                                    "type": "TextBlock",
                                                    "text": launch.mission_name,
                                                    "weight": "bolder",
                                                    "wrap": true
                                            },
                                            {
                                                "type": "TextBlock",
                                                "weight": "bolder",
                                                "text": launch.flight_number,
                                                "wrap": true
                                            },
                                            {
                                                    "type": "TextBlock",
                                                    "weight": "bolder",
                                                    "text": launch.rocket.rocket_name,
                                                    "wrap": true
                                            }
                                        ]
                                    }   
                                ]

                            },
                            {
                                "type": "Container",
                                "items": [
                                    {
                                        "type": "FactSet",
                                        "facts": [
                                            {
                                                "title": "Date:",
                                                "value": dateFormat(launch.launch_date_utc,"d/m/yyyy, H:MM:ss")
                                            },
                                            {
                                                "title": "Site:",
                                                "value": launch.launch_site.site_name_long
                                            },
                                           
                                        ]
                                    }
                                ]
                            },
                            {
                                "type": "Container",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text": launch.details == null ? "": launch.details,
                                        "wrap": true
                                    },
                                ]
                            },
                            
                        ]
                    }
                ];
        return adaptiveCardMessage;
}

function buildLatestLaunchActions(launch){
    var actions = [];
    if (launch.links.wikipedia != null) {
        var wiki = {
            "type": "Action.OpenUrl",
            "title": "Wiki",
            "url": launch.links.wikipedia
        };
        actions.push(wiki);
    }   
    if (launch.links.video_link != null) {
        var yt = {
            "type": "Action.OpenUrl",
            "title": "Youtube",
            "url": launch.links.video_link
        };
        actions.push(yt);
    }
    return actions;
}

bot.dialog('option2', [
    function (session) {
        //session.send('We are in the option 3 dialog !')//Message envoyé
        session.sendTyping();
        var vehicules;
        SpaceX.getAllLaunches({launch_success: true,},function(err, info){
            info.forEach(function(element) {
                var msg = new builder.Message(session)
                    .addAttachment({
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        type: "AdaptiveCard",
                        speak: "",
                        body: allLaunchesAttachments(element),
                        actions:
                        [
                            {
                                "type": "Action.OpenUrl",
                                "title": "Wiki",
                                "url": element.links.wikipedia
                            },
                            {
                                "type": "Action.OpenUrl",
                                "title": "Youtube",
                                "url": element.links.video_link
                            }
                        ]
                    }
                });
                session.send(msg);
            });
            sleep(process.env.TIMEOUT);
            session.beginDialog('menu', session.userData.profile);
        });
    }
 ]);

 function allLaunchesAttachments(element){ 
    var body = [
            {
                "type": "Container",
                "items": [
                    {
                        "type": "ColumnSet",
                        "columns": [
                            {
                                "type": "Column",
                                "width": "auto",
                                "items": [
                                    {
                                        "type": "Image",
                                        "url": element.links.mission_patch_small,
                                        "size": "small",
                                        "style": "person"
                                    }
                                ]
                            },
                            {
                                "type": "Column",
                                "width": "stretch",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text": element.flight_number,
                                        "weight": "bolder",
                                        "wrap": true
                                    },
                                    {
                                        "type": "TextBlock",
                                        "weight": "bolder",
                                        "text":  element.mission_name,
                                        "wrap": true
                                    },
                                ]
                            }   
                        ]
                    },
                    {
                        "type": "Container",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": element.details,
                                "wrap": true
                            },
                        ]
                    },
                    {
                        "type": "Container",
                        "items": [
                            {
                                "type": "FactSet",
                                "facts": [
                                    {
                                        "title": "Year:",
                                        "value": element.launch_year 
                                    },
                                    {
                                        "title": "Site:",
                                        "value": element.launch_site.site_name_long 
                                    }, 
                                ],
                            }
                        ],
                    },
                ],
            }
        ];    
    return body;
}

bot.dialog('option3', [
    //dialogue de retour pour option3
    function (session) {
        session.sendTyping();
        SpaceX.getCompanyInfo(function (err, launch) {
            var InfoadaptiveCardMessage = new builder.Message(session)
            .addAttachment({
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    type: "AdaptiveCard",
                    body: buildInfoAdaptiveCard(launch)
                }
            });
            session.send(InfoadaptiveCardMessage);
            sleep(process.env.TIMEOUT);
            session.beginDialog('menu', session.userData.profile);
        });
    },
]);

 function buildInfoAdaptiveCard(launch){
    var InfoadaptiveCardMessage = [
                {
                    "type": "Container",
                    "items": [
                        {
                            "type": "Container",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": launch.name,
                                    "wrap": true,
                                    "size": "medium",
                                    "weight": "bolder"
                                },
                                
                            ]
                        },
                        {
                            "type": "Container",
                            "items": [
                                {
                                    "type": "FactSet",
                                    "facts": [
                                        {
                                            "title": "Founder :",
                                            "value": launch.founder
                                        },
                                        {
                                            "title": "Founded:",
                                            "value": launch.founded
                                        },
                                       
                                    ]
                                }
                            ]
                        },
                        {
                            "type": "Container",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": launch.summary,
                                    "wrap": true
                                },
                            ]
                        },
                        {
                            "type": "Container",
                            "items": [
                                {
                                    "type": "FactSet",
                                    "facts": [
                                        {
                                            "title": "employees:",
                                            "value": launch.employees
                                        },
                                        {
                                            "title": "Launch Site:",
                                            "value": launch.launch_sites
                                        },
                                        {
                                            "title": "Headquarters:",
                                            "value": launch.headquarters.state
                                        },
                                       
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ];
    return InfoadaptiveCardMessage;
}

 bot.dialog('option4', [//dialogue de retour pour option3
    function (session) {
        //session.send('We are in the option 3 dialog !')//Message envoyé
        session.sendTyping();
        var vehicules;
        SpaceX.getAllRockets(function(err, info){
         //   var msg=JSON.stringify(info)
            info.forEach(function(element) {
                var msg = new builder.Message(session)
                .addAttachment({
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        type: "AdaptiveCard",
                        speak: "",
                        body: allRocketsAttachments(element),
                            
                    }
                });
                session.send(msg);
            });  
            sleep(process.env.TIMEOUT);
            session.beginDialog('menu', session.userData.profile);
        });
    }
 ]);

 function allRocketsAttachments(element){
    var body = [
        {
            "type": "Container",
            "items": [
                {
                    "type": "Container",
                    "items": [
                        {
                            "type": "Container",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": element.name,
                                    "wrap": true,
                                    "size": "medium",
                                    "weight": "bolder"
                                },
                                {
                                    "type": "TextBlock",
                                    "text": element.country,
                                    "wrap": true
                                },
                                {
                                    "type": "TextBlock",
                                    "text":  element.company,
                                    "wrap": true
                                }
                                
                            ]
                        }, 
                        {
                            "type": "Container",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": element.description,
                                    "wrap": true
                                },
                            ]
                        },
                        {
                            "type": "Container",
                            "items": [
                                {
                                    "type": "FactSet",
                                    "facts": [
                                        {
                                            "title": "Height:",
                                            "value": element.height.meters 
                                        },
                                        {
                                            "title": "Mass:",
                                            "value": element.mass.kg 
                                        },
                                    
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ];
    return body;
}

 
 bot.dialog('option5', [//dialogue de retour pour option3
    function (session) {
        //session.send('We are in the option 3 dialog !')//Message envoyé
        session.sendTyping();
        var vehicules;
        SpaceX.getAllLaunchPads(function(err, info){
            info.forEach(function(element) {
                var msg = new builder.Message(session)
                .addAttachment({
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        type: "AdaptiveCard",
                        speak: "",
                        body: allLaunchesBodyAttachments(element),
                            
                    }
                });
                session.send(msg);
            });
            sleep(process.env.TIMEOUT);
            session.beginDialog('menu', session.userData.profile);  
        });
    }
 ]);


 function allLaunchesBodyAttachments(element){
    var body = [
        {
            "type": "Container",
            "items": [
                {
                    "type": "Container",
                    "items": [
                        {
                            "type": "Container",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": element.full_name,
                                    "wrap": true,
                                    "size": "medium",
                                    "weight": "bolder"
                                },
                                {
                                    "type": "TextBlock",
                                    "text": element.location.name,
                                    "wrap": true
                                },
                                {
                                    "type": "TextBlock",
                                    "text":  element.vehicles_launched,
                                    "wrap": true
                                }
                                
                            ]
                        }, 
                        {
                            "type": "Container",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": element.details,
                                    "wrap": true
                                },
                            ]
                        },
                        {
                            "type": "Container",
                            "items": [
                                {
                                    "type": "FactSet",
                                    "facts": [
                                        {
                                            "title": "Latitude:",
                                            "value": element.location.latitude 
                                        },
                                        {
                                            "title": "Longitude:",
                                            "value": element.location.longitude
                                        },
                                    
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }     
    ];
    return body;
}
