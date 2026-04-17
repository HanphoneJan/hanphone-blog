package com.example.blog.service.impl;

import com.example.blog.dao.FriendLinkRepository;
import com.example.blog.po.FriendLink;
import com.example.blog.service.FriendLinkService;
import com.example.blog.util.MyBeanUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
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
            FriendLink p = friendLinkRepository.getOne(id);
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
            FriendLink friendLink = friendLinkRepository.getOne(id);
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
        
        // 定义正则表达式模式
        Map<String, Pattern> patterns = new HashMap<>();
        patterns.put("name", Pattern.compile("[" + "名称" + "](?:名称|站点|标题)?\\s*[:：]\\s*[\"']?([^\"'\\n,，]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("description", Pattern.compile("[" + "描述" + "](?:描述|简介|说明|介绍)?\\s*[:：]\\s*[\"']?([^\"'\\n,，]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("url", Pattern.compile("[" + "链接" + "](?:链接|网址|URL|地址|网站)?\\s*[:：]\\s*[\"']?([^\"'\\n,，]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("avatar", Pattern.compile("[" + "头像" + "](?:头像|图标|logo|头像地址|图标地址)?\\s*[:：]\\s*[\"']?([^\"'\\n,，]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("siteshot", Pattern.compile("[" + "截图" + "](?:截图|预览|站点截图|网站截图|预览图)?\\s*[:：]\\s*[\"']?([^\"'\\n,，]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("rss", Pattern.compile("[" + "RSS" + "](?:RSS|rss|订阅|feed)?\\s*[:：]\\s*[\"']?([^\"'\\n,，]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("nickname", Pattern.compile("[" + "昵称" + "](?:昵称|站长|作者|昵称|名字)?\\s*[:：]\\s*[\"']?([^\"'\\n,，]+)[\"']?", Pattern.CASE_INSENSITIVE));
        patterns.put("color", Pattern.compile("[" + "颜色" + "](?:颜色|主题色|装饰色|配色|color)?\\s*[:：]\\s*[\"']?([^\"'\\n,，]+)[\"']?", Pattern.CASE_INSENSITIVE));
        
        // 执行匹配
        for (Map.Entry<String, Pattern> entry : patterns.entrySet()) {
            Matcher matcher = entry.getValue().matcher(applyText);
            if (matcher.find()) {
                String value = matcher.group(1).trim();
                // 移除末尾的逗号、分号等
                value = value.replaceAll("[,，;；\\s]+$", "");
                result.put(entry.getKey(), value);
            }
        }
        
        // 备用：尝试从纯URL提取
        if (!result.containsKey("url")) {
            Pattern urlPattern = Pattern.compile("(https?://[^\\s\"'<>\\n]+)");
            Matcher urlMatcher = urlPattern.matcher(applyText);
            if (urlMatcher.find()) {
                result.put("url", urlMatcher.group(1));
            }
        }
        
        return result;
    }
}
