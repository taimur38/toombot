const onMessage = message => {

    if(!message.imageTags || !message.imageTags.length)
        return Promise.resolve(false);

    return Promise.resolve(`That looks like a ${message.imageTags[0].text}!`)

}

module.exports = {
    onMessage
}
