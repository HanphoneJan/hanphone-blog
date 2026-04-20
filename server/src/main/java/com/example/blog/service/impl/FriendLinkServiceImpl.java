package com.example.blog.service.impl;

import com.example.blog.dao.FriendLinkRepository;
import com.example.blog.po.FriendLink;
import com.example.blog.service.FriendLinkService;
import com.example.blog.util.MyBeanUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static java.util.Objects.requireNonNull;

@Service
public class FriendLinkServiceImpl implements FriendLinkService {

    private final FriendLinkRepository friendLinkRepository;

    // 构造函数注入时校验依赖非空
    public FriendLinkServiceImpl(FriendLinkRepository friendLinkRepository) {
        this.friendLinkRepository = Objects.requireNonNull(friendLinkRepository, "friendLinkRepository must not be null");
    }

    @Override
    public List<FriendLink> listFriendLink() {
        try {
            // 前台只返回已发布的友链
            return friendLinkRepository.findAllPublished();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get friend link list", e);
        }
    }
    
    @Override
    public List<FriendLink> listAllFriendLinks() {
        try {
            // 后台返回所有友链
            return friendLinkRepository.findAll();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get all friend links", e);
        }
    }
    
    @Override
    public List<FriendLink> listByPublished(Boolean published) {
        try {
            return friendLinkRepository.findByPublished(published);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get friend links by published status", e);
        }
    }

    @Override
    public void deleteFriendLink(Long id) {
        Objects.requireNonNull(id, "friend link id must not be null");
        try {
            friendLinkRepository.deleteById(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete friend link with id: " + id, e);
        }
    }

    @Override
    public FriendLink saveFriendLink(FriendLink friendLink) {
        Objects.requireNonNull(friendLink, "friendLink must not be null");
        try {
            // 默认未发布
            if (friendLink.getPublished() == null) {
                friendLink.setPublished(false);
            }
            return friendLinkRepository.save(friendLink);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save friend link", e);
        }
    }

    @Override
    public FriendLink updateFriendLink(Long id, FriendLink friendLink) {
        Objects.requireNonNull(id, "friend link id must not be null");
        Objects.requireNonNull(friendLink, "friendLink must not be null");
        try {
            FriendLink p = friendLinkRepository.getReferenceById(id);
            Objects.requireNonNull(p, "friend link with id: " + id + " not found");

            BeanUtils.copyProperties(friendLink, p, MyBeanUtils.getNullPropertyNames(friendLink));
            return friendLinkRepository.save(p);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update friend link with id: " + id, e);
        }
    }

    @Override
    @Transactional
    public Boolean changeRecommend(Long id, Boolean recommend) {
        requireNonNull(id, "friendLink id must not be null");
        requireNonNull(recommend, "recommend flag must not be null");
        try {
            int affectedRows = friendLinkRepository.updateRecommend(id, recommend);
            return affectedRows > 0;
        } catch (Exception e) {
            throw new RuntimeException("Error changing recommend status for friendLink : " + id, e);
        }
    }
    
    @Override
    @Transactional
    public Boolean changePublished(Long id, Boolean published) {
        requireNonNull(id, "friendLink id must not be null");
        requireNonNull(published, "published flag must not be null");
        try {
            FriendLink friendLink = friendLinkRepository.getReferenceById(id);
            if (friendLink == null) {
                return false;
            }
            friendLink.setPublished(published);
            friendLinkRepository.save(friendLink);
            return true;
        } catch (Exception e) {
            throw new RuntimeException("Error changing published status for friendLink: " + id, e);
        }
    }
    
    @Override
    public FriendLink applyFriendLink(FriendLink friendLink) {
        Objects.requireNonNull(friendLink, "friendLink must not be null");
        try {
            // 前台申请默认未发布
            friendLink.setPublished(false);
            friendLink.setRecommend(false);
            
            // 如果有applyText，尝试自动解析填充字段
            if (friendLink.getApplyText() != null && !friendLink.getApplyText().isEmpty()) {
                Map<String, String> parsed = parseApplyText(friendLink.getApplyText());
                
                // 只有字段为空时才使用解析的值
                if ((friendLink.getName() == null || friendLink.getName().isEmpty()) && parsed.get("name") != null) {
                    friendLink.setName(parsed.get("name"));
                }
                if ((friendLink.getDescription() == null || friendLink.getDescription().isEmpty()) && parsed.get("description") != null) {
                    friendLink.setDescription(parsed.get("description"));
                }
                if ((friendLink.getUrl() == null || friendLink.getUrl().isEmpty()) && parsed.get("url") != null) {
                    friendLink.setUrl(parsed.get("url"));
                }
                if ((friendLink.getLinkUrl() == null || friendLink.getLinkUrl().isEmpty()) && parsed.get("link_url") != null) {
                    friendLink.setLinkUrl(parsed.get("link_url"));
                }
                if ((friendLink.getAvatar() == null || friendLink.getAvatar().isEmpty()) && parsed.get("avatar") != null) {
                    friendLink.setAvatar(parsed.get("avatar"));
                }
                if ((friendLink.getSiteshot() == null || friendLink.getSiteshot().isEmpty()) && parsed.get("siteshot") != null) {
                    friendLink.setSiteshot(parsed.get("siteshot"));
                }
                if ((friendLink.getRss() == null || friendLink.getRss().isEmpty()) && parsed.get("rss") != null) {
                    friendLink.setRss(parsed.get("rss"));
                }
                if ((friendLink.getNickname() == null || friendLink.getNickname().isEmpty()) && parsed.get("nickname") != null) {
                    friendLink.setNickname(parsed.get("nickname"));
                }
                if ((friendLink.getColor() == null || friendLink.getColor().isEmpty()) && parsed.get("color") != null) {
                    friendLink.setColor(parsed.get("color"));
                }
            }
            
            friendLink.setCreateTime(new Date());
            return friendLinkRepository.save(friendLink);
        } catch (Exception e) {
            throw new RuntimeException("Failed to apply friend link", e);
        }
    }
    
    @Override
    public Map<String, String> parseApplyText(String applyText) {
        Map<String, String> result = new HashMap<>();
        if (applyText == null || applyText.isEmpty()) {
            return result;
        }
        
        // 定义正则表达式模式 —— 使用精确的关键词匹配，避免字段混淆
        // 每个模式只匹配对应的关键词前缀，如"名称:"、"链接:"、"回访链接:"等
        Map<String, Pattern> patterns = new LinkedHashMap<>();
        // 回访地址优先匹配，避免被 url 的"链接"模式抢先匹配
        patterns.put("link_url", Pattern.compile("回访(?:链接|地址|网址|url)\\s*[:：]\\s*[\"']?(https?://[^\"'\\n,，\\s]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("name", Pattern.compile("(?:名称|站点名?|标题|网站名?)\\s*[:：]\\s*[\"']?([^\"'\\n,，]+?)[\"']?\\s*$", Pattern.MULTILINE | Pattern.CASE_INSENSITIVE));
        patterns.put("description", Pattern.compile("(?:描述|简介|说明|介绍|签名)\\s*[:：]\\s*[\"']?([^\"'\\n]+?)[\"']?\\s*$", Pattern.MULTILINE | Pattern.CASE_INSENSITIVE));
        patterns.put("url", Pattern.compile("(?:链接|网址|地址|网站|url|site)\\s*[:：]\\s*[\"']?(https?://[^\"'\\n,，\\s]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("avatar", Pattern.compile("(?:头像|图标|logo|头像地址|图标地址)\\s*[:：]\\s*[\"']?(https?://[^\"'\\n,，\\s]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("siteshot", Pattern.compile("(?:截图|预览(?:图)?|站点截图|网站截图|封面图)\\s*[:：]\\s*[\"']?(https?://[^\"'\\n,，\\s]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("rss", Pattern.compile("(?:RSS|rss|订阅|feed)\\s*[:：]\\s*[\"']?(https?://[^\"'\\n,，\\s]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("nickname", Pattern.compile("(?:昵称|站长|作者|名字|网名)\\s*[:：]\\s*[\"']?([^\"'\\n,，]+?)[\"']?\\s*$", Pattern.MULTILINE | Pattern.CASE_INSENSITIVE));
        patterns.put("color", Pattern.compile("(?:颜色|主题色|装饰色|配色|color)\\s*[:：]\\s*[\"']?(#[0-9a-fA-F]{3,8})[\"']?", Pattern.CASE_INSENSITIVE));
        
        // 执行匹配
        for (Map.Entry<String, Pattern> entry : patterns.entrySet()) {
            Matcher matcher = entry.getValue().matcher(applyText);
            if (matcher.find()) {
                String value = matcher.group(1).trim();
                // 移除末尾的标点符号
                value = value.replaceAll("[,，;；\\s]+$", "");
                if (!value.isEmpty()) {
                    result.put(entry.getKey(), value);
                }
            }
        }
        
        // 备用：如果 url 仍未匹配，尝试从纯URL行提取（取第一个非头像/截图/RSS的URL）
        if (!result.containsKey("url")) {
            Pattern urlPattern = Pattern.compile("(https?://[^\\s\"'<>\\n]+)");
            Matcher urlMatcher = urlPattern.matcher(applyText);
            // 跳过已识别为其他用途的URL
            Set<String> usedUrls = new HashSet<>();
            for (String key : Arrays.asList("avatar", "siteshot", "rss", "link_url")) {
                if (result.containsKey(key)) {
                    usedUrls.add(result.get(key));
                }
            }
            while (urlMatcher.find()) {
                String foundUrl = urlMatcher.group(1).trim();
                if (!usedUrls.contains(foundUrl)) {
                    result.put("url", foundUrl);
                    break;
                }
            }
        }
        
        return result;
    }
}
